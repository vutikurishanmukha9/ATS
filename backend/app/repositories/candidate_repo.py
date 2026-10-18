import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    and_,
    asc,
    desc,
    func,
    literal_column,
    or_,
    select,
    text,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate import Candidate, CandidateSource, CandidateStage


class CandidateRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, candidate_id: uuid.UUID, include_deleted: bool = False) -> Candidate | None:
        stmt = select(Candidate).where(Candidate.id == candidate_id)
        if not include_deleted:
            stmt = stmt.where(Candidate.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str, include_deleted: bool = False) -> Candidate | None:
        stmt = select(Candidate).where(func.lower(Candidate.email) == email.strip().lower())
        if not include_deleted:
            stmt = stmt.where(Candidate.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_ids(self, ids: list[uuid.UUID]) -> list[Candidate]:
        if not ids:
            return []
        stmt = select(Candidate).where(Candidate.id.in_(ids)).where(Candidate.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, candidate: Candidate) -> Candidate:
        self.session.add(candidate)
        await self.session.flush()
        await self.session.refresh(candidate)
        return candidate

    async def soft_delete(self, candidate_id: uuid.UUID) -> bool:
        candidate = await self.get_by_id(candidate_id)
        if not candidate:
            return False
        candidate.deleted_at = datetime.now(UTC)
        await self.session.flush()
        return True

    async def list_candidates(
        self,
        q: str | None = None,
        stages: list[CandidateStage] | None = None,
        sources: list[CandidateSource] | None = None,
        role: str | None = None,
        skills: list[str] | None = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
        sort: str = "created_at",
        order: str = "desc",
        page: int = 1,
        page_size: int = 25,
    ) -> tuple[list[Candidate], int]:
        is_postgres = self.session.bind.dialect.name == "postgresql" if self.session.bind else False

        conditions = [Candidate.deleted_at.is_(None)]

        if stages:
            conditions.append(Candidate.current_stage.in_(stages))

        if sources:
            conditions.append(Candidate.source.in_(sources))

        if role:
            conditions.append(Candidate.applied_role == role)

        if skills:
            for skill in skills:
                if is_postgres:
                    conditions.append(Candidate.skills.any(skill))
                else:
                    # SQLite fallback: search JSON text
                    conditions.append(Candidate.skills.contains(skill))

        if created_from:
            conditions.append(Candidate.created_at >= created_from)

        if created_to:
            conditions.append(Candidate.created_at <= created_to)

        relevance_score = None

        if q and q.strip():
            query_clean = q.strip()
            # Clean for tsquery words
            words = re.findall(r"\w+", query_clean)
            tsquery_str = " & ".join([f"{w}:*" for w in words]) if words else ""

            if is_postgres and tsquery_str:
                # Combined tsvector prefix match with trigram matching
                trgm_filter = or_(
                    text("candidates.full_name % :q"),
                    text("candidates.email % :q"),
                    Candidate.full_name.ilike(f"%{query_clean}%"),
                    Candidate.email.ilike(f"%{query_clean}%"),
                    Candidate.applied_role.ilike(f"%{query_clean}%"),
                )
                ts_filter = text("candidates.search_vector @@ to_tsquery('english', :tsquery)")
                conditions.append(or_(ts_filter, trgm_filter))

                relevance_score = (
                    func.ts_rank(
                        literal_column("candidates.search_vector"),
                        func.to_tsquery("english", tsquery_str),
                    )
                    + func.similarity(Candidate.full_name, query_clean) * 2.0
                    + func.similarity(Candidate.email, query_clean)
                ).label("relevance")
            else:
                # Enterprise Boolean search engine (AND, OR, NOT) across full profile & resume text
                not_pattern = r'\bNOT\s+(\S+)'
                excluded_terms = [m.lower() for m in re.findall(not_pattern, query_clean, re.IGNORECASE)]
                positive_query = re.sub(not_pattern, '', query_clean, flags=re.IGNORECASE).strip()

                def _field_match(term: str):
                    lt = f"%{term}%"
                    return or_(
                        Candidate.full_name.ilike(lt),
                        Candidate.email.ilike(lt),
                        Candidate.applied_role.ilike(lt),
                        Candidate.location.ilike(lt),
                        func.coalesce(Candidate.skills, "").ilike(lt),
                        func.coalesce(Candidate.resume_text, "").ilike(lt),
                    )

                def _field_exclude(term: str):
                    lt = f"%{term}%"
                    return and_(
                        ~Candidate.full_name.ilike(lt),
                        ~Candidate.applied_role.ilike(lt),
                        ~func.coalesce(Candidate.skills, "").ilike(lt),
                        ~func.coalesce(Candidate.resume_text, "").ilike(lt),
                    )

                if " OR " in positive_query:
                    or_terms = [p.strip() for p in positive_query.split(" OR ") if p.strip()]
                    if or_terms:
                        conditions.append(or_(*[_field_match(t) for t in or_terms]))
                elif " AND " in positive_query:
                    and_terms = [p.strip() for p in positive_query.split(" AND ") if p.strip()]
                    for t in and_terms:
                        conditions.append(_field_match(t))
                else:
                    tokens = positive_query.split()
                    for t in tokens:
                        conditions.append(_field_match(t))

                for ex in excluded_terms:
                    conditions.append(_field_exclude(ex))

        # Count query
        count_stmt = select(func.count(Candidate.id)).where(and_(*conditions))
        if is_postgres and q and q.strip():
            words = re.findall(r"\w+", q.strip())
            tsquery_str = " & ".join([f"{w}:*" for w in words]) if words else ""
            count_stmt = count_stmt.params(q=q.strip(), tsquery=tsquery_str)

        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one()

        # Query candidates
        stmt = select(Candidate).where(and_(*conditions))

        if is_postgres and q and q.strip():
            words = re.findall(r"\w+", q.strip())
            tsquery_str = " & ".join([f"{w}:*" for w in words]) if words else ""
            stmt = stmt.params(q=q.strip(), tsquery=tsquery_str)

        # Sorting & Ranking
        if q and q.strip() and relevance_score is not None:
            stmt = stmt.order_by(desc(relevance_score))
        else:
            sort_attr = getattr(Candidate, sort, Candidate.created_at)
            stmt = stmt.order_by(desc(sort_attr) if order.lower() == "desc" else asc(sort_attr))

        # Pagination (page_size capped at 100)
        page_size = min(max(page_size, 1), 100)
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def get_facets(self) -> dict:
        """Computes distinct roles, sources, stages, and top skills with counts."""
        base_where = Candidate.deleted_at.is_(None)

        # Roles
        roles_stmt = (
            select(Candidate.applied_role, func.count(Candidate.id))
            .where(base_where)
            .group_by(Candidate.applied_role)
            .order_by(func.count(Candidate.id).desc())
        )
        roles_res = await self.session.execute(roles_stmt)
        roles = [{"value": r[0], "count": r[1]} for r in roles_res.all() if r[0]]

        # Sources
        sources_stmt = (
            select(Candidate.source, func.count(Candidate.id))
            .where(base_where)
            .group_by(Candidate.source)
            .order_by(func.count(Candidate.id).desc())
        )
        sources_res = await self.session.execute(sources_stmt)
        sources = [
            {
                "value": str(s[0].value if hasattr(s[0], "value") else s[0]),
                "count": s[1],
            }
            for s in sources_res.all()
        ]

        # Stages
        stages_stmt = (
            select(Candidate.current_stage, func.count(Candidate.id))
            .where(base_where)
            .group_by(Candidate.current_stage)
            .order_by(func.count(Candidate.id).desc())
        )
        stages_res = await self.session.execute(stages_stmt)
        stages = [
            {
                "value": str(s[0].value if hasattr(s[0], "value") else s[0]),
                "count": s[1],
            }
            for s in stages_res.all()
        ]

        # Top skills aggregation
        candidates_stmt = select(Candidate.skills).where(base_where)
        skills_res = await self.session.execute(candidates_stmt)
        skill_counts: dict[str, int] = {}
        for row in skills_res.scalars().all():
            if isinstance(row, list):
                for sk in row:
                    skill_counts[sk] = skill_counts.get(sk, 0) + 1
        sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:50]
        skills = [{"value": s[0], "count": s[1]} for s in sorted_skills]

        return {
            "roles": roles,
            "sources": sources,
            "stages": stages,
            "skills": skills,
        }
