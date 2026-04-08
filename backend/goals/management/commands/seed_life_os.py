"""Management command to seed the Life OS with real initial data."""
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_date

from finance.models import FinanceSummary
from goals.models import Node


class Command(BaseCommand):
    help = "Seed Life OS with real goals, projects, and tasks. Safe to re-run (skips existing codes)."

    def handle(self, *args, **options):
        self._seed_nodes()
        self._seed_finance()
        self.stdout.write(self.style.SUCCESS("Seed complete."))

    def _node(self, code, title, ntype, category, status, parent=None,
               priority=None, progress=0, tags=None, notes="",
               effort="", target_date=None):
        obj, created = Node.objects.update_or_create(
            code=code,
            defaults=dict(
                title=title,
                type=ntype,
                category=category,
                status=status,
                parent=parent,
                priority=priority,
                progress=progress,
                tags=tags or [],
                notes=notes,
                effort=effort,
                target_date=parse_date(target_date) if target_date else None,
            ),
        )
        verb = "Created" if created else "Updated"
        self.stdout.write(f"  {verb} [{code}] {title}")
        return obj

    def _seed_nodes(self):
        self.stdout.write("Seeding nodes...")

        # — Goals —
        g1 = self._node("g1", "Move family to Kyrgyzstan", "goal", "Life", "blocked",
                         priority=1, tags=["family", "long-term"],
                         notes="Ultimate goal. Trigger: €1,000/month independent income.")
        g2 = self._node("g2", "Reach €1,000/month independent income", "goal", "Finance", "active",
                         priority=1, tags=["income", "freedom"],
                         notes="Currently €0 independent. Everything depends on this number.")
        g3 = self._node("g3", "Build service business", "goal", "Work", "active",
                         priority=1, progress=10, tags=["income", "service"],
                         notes="Operations Clarity Audit. €150 first clients → €300+.")
        g4 = self._node("g4", "Resolve housing & noise situation", "goal", "Life", "blocked",
                         priority=1, tags=["urgent", "mental-health"],
                         notes="9 months of noise from upstairs neighbors. Carpet solution costs €0.")
        self._node("g5", "Pay off all debts (33,150 EGP)", "goal", "Finance", "active",
                    priority=2, tags=["debt", "stability"],
                    notes="Total: 33,150 EGP across 5 debts. Clear smallest first.")
        self._node("g6", "Build fitness routine", "goal", "Health", "available",
                    priority=2, tags=["health", "discipline"],
                    notes="Target: exercise 5x/week. Currently inconsistent.")
        self._node("g7", "Consistent daily spiritual practice", "goal", "Spiritual", "available",
                    priority=1, tags=["faith", "daily"],
                    notes="Fajr at mosque daily + 1 juz Quran + adhkar morning/evening.")
        self._node("g8", "Build family daily schedule", "goal", "Family", "available",
                    priority=2, tags=["family", "structure"],
                    notes="Structured evening routine with kids: Quran memorization + reading + sleep by 22:00.")

        # — Projects (children of g3) —
        p1 = self._node("p1", "Operations Clarity Audit service", "project", "Work", "active",
                          parent=g3, priority=1, progress=15,
                          notes="€150/audit → target 3/month = €450. First client unlocks everything.")
        self._node("p2", "Partner with perfumes friend", "project", "Work", "active",
                    parent=g3, priority=2, progress=20,
                    notes="Import/resell perfumes. Low capital needed. Friend has supplier contacts.")
        self._node("p3", "Partner with laptops friend", "project", "Work", "active",
                    parent=g3, priority=2, progress=20,
                    notes="Refurbished laptop trade. Friend sources stock. Need to clarify margin split.")

        # — Tasks —
        t1 = self._node("t1", "Write outreach message to warm contact #1", "task", "Work", "available",
                          parent=p1, priority=1, effort="1h", target_date="2026-04-13",
                          tags=["income", "urgent"],
                          notes="The only action that moves money right now.")
        t2 = self._node("t2", "Send outreach message", "task", "Work", "blocked",
                          parent=p1, priority=1, effort="15min", target_date="2026-04-13",
                          notes="Blocked until t1 is done. One message = first potential client.")
        self._node("t3", "Build intake questionnaire for audit", "task", "Work", "available",
                    parent=p1, priority=2, effort="2h",
                    notes="5–7 questions to qualify clients before the audit call. Notion or Google Form.")
        self._node("t4", "Offer carpet to upstairs neighbors", "task", "Life", "available",
                    parent=g4, priority=1, effort="30min", tags=["noise", "urgent"],
                    notes="Propose carpet purchase to neighbors. Estimated cost €0 if they accept old carpet.")
        self._node("t5", "Rewrite LinkedIn profile", "task", "Work", "available",
                    parent=p1, priority=3, effort="2h", tags=["marketing"],
                    notes="Position as 'Operations Clarity' consultant. Add headline, about, services section.")
        self._node("t6", "Design family daily schedule template", "task", "Family", "available",
                    parent=self._get("g8"), priority=2, effort="2h",
                    notes="Simple printable schedule: Fajr → school → work blocks → family time → Isha → sleep.")

        # — Set dependencies —
        g1.deps.set([g2])   # Can't move to Kyrgyzstan until €1k/mo independent
        g2.deps.set([g3])   # Can't reach €1k/mo without the service business
        g4.deps.clear()     # g4 blocked by noise situation itself, not another node
        t2.deps.set([t1])

        self.stdout.write(self.style.SUCCESS("  Nodes seeded."))

    def _get(self, code):
        return Node.objects.get(code=code)

    def _seed_finance(self):
        self.stdout.write("Seeding finance summary...")
        obj = FinanceSummary.get()
        obj.income_eur = 700
        obj.income_sources_text = "K Line Europe (€700)"
        obj.independent_monthly = 0
        obj.target_independent = 1000
        obj.monthly_expenses_egp = 25500
        obj.notes = ""
        obj.debts = [
            {"name": "Tante Amora", "amount_egp": 1150},
            {"name": "Court rent arrears", "amount_egp": 2000},
            {"name": "Laptop for Abdulrahman", "amount_egp": 10000},
            {"name": "Staircase repair", "amount_egp": 13000},
            {"name": "Other debt", "amount_egp": 7000},
        ]
        obj.save()
        self.stdout.write(self.style.SUCCESS("  Finance summary seeded."))
