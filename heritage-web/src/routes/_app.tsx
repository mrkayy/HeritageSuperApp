import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Building2,
  Cake,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  HeartHandshake,
  Home,
  LogOut,
  Menu,
  PhoneCall,
  ShieldCheck,
  UserPlus,
  Users2,
  X,
} from 'lucide-react'
import { api, type Me } from '#/lib/api'
import { hasCapability, meQuery } from '#/lib/auth'

/**
 * Authenticated workspace shell — styled after `web/src/components/layout/AppLayout.tsx`
 * and `AppSidebar.tsx` with frosted `.glass-card` sidebar, grouped team sections,
 * Heritage MMC logo lockup, and responsive mobile drawer.
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    let me = context.queryClient.getQueryData<Me | null>(meQuery.queryKey)
    if (!me) {
      me = await context.queryClient.fetchQuery(meQuery).catch(() => null)
    }
    if (!me) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { me }
  },
  component: AppShell,
})

function AppShell() {
  const { data: me } = useSuspenseQuery(meQuery)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!me) return null

  async function onLogout() {
    await api('/auth/logout', { method: 'POST' })
    queryClient.setQueryData(meQuery.queryKey, null)
    await navigate({ to: '/login', replace: true })
  }

  const navGroups = [
    {
      label: 'Command Center',
      items: [{ to: '/dashboard' as const, label: 'Dashboard', icon: Home, show: true }],
    },
    {
      label: 'Information Center & Services',
      items: [
        {
          to: '/intake' as const,
          label: 'Visitor Intake',
          icon: UserPlus,
          show: hasCapability(me, 'visitors.capture'),
        },
        {
          to: '/attendance' as const,
          label: 'Service Attendance',
          icon: ClipboardCheck,
          show: hasCapability(me, 'attendance.record'),
        },
      ].filter((i) => i.show),
    },
    {
      label: 'Membership Team',
      items: [
        {
          to: '/directory' as const,
          label: 'People Directory',
          icon: Users2,
          show: hasCapability(me, 'people.read'),
        },
        {
          to: '/follow-up' as const,
          label: 'Follow-Up Queue',
          icon: PhoneCall,
          show: hasCapability(me, 'followups.read'),
        },
        {
          to: '/import' as const,
          label: 'Bulk CSV Import',
          icon: FileSpreadsheet,
          show: hasCapability(me, 'people.import'),
        },
        {
          to: '/academy' as const,
          label: 'Sunday School & Academy',
          icon: GraduationCap,
          show: hasCapability(me, 'academy.read'),
        },
        {
          to: '/volunteers' as const,
          label: 'Volunteer Placement',
          icon: HeartHandshake,
          show: hasCapability(me, 'volunteers.apply') || hasCapability(me, 'volunteers.manage'),
        },
        {
          to: '/proposals' as const,
          label: 'Profile Approvals',
          icon: ShieldCheck,
          show: hasCapability(me, 'people.read'),
        },
        {
          to: '/celebrations' as const,
          label: 'Celebrations & Landmarks',
          icon: Cake,
          show: hasCapability(me, 'celebrations.read') || hasCapability(me, 'people.read'),
        },
        {
          to: '/prayer-notes' as const,
          label: 'Pastoral Prayer Notes',
          icon: HeartHandshake,
          show: hasCapability(me, 'prayer_notes.manage'),
        },
      ].filter((i) => i.show),
    },
    {
      label: 'Administration',
      items: [
        {
          to: '/stewards' as const,
          label: 'Stewards & Invites',
          icon: ShieldCheck,
          show: hasCapability(me, 'stewards.read'),
        },
      ].filter((i) => i.show),
    },
  ].filter((g) => g.items.length > 0)

  const initials = `${me.first_name.charAt(0)}${me.last_name.charAt(0)}`.toUpperCase()
  const roleSummary =
    me.assignments.map((a) => (a.team ? `${a.role_label} · ${a.team.name}` : a.role_label)).join(', ') || 'Steward'

  return (
    <div className="flex min-h-dvh w-full">
      {/* Desktop Frosted Glass Sidebar (matched with web/src/components/layout/AppSidebar.tsx) */}
      <aside className="glass-card sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/60 lg:flex">
        {/* Sidebar Header */}
        <div className="border-b border-border/50 px-5 py-4">
          <Link to="/dashboard" className="flex items-center gap-3 text-foreground hover:opacity-90">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white p-1.5 shadow-2xs">
              <img src="/logo-design.png" alt="Heritage MMC Logo" className="h-8 w-8 object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold leading-tight text-primary">Heritage MMC</h2>
              <p className="truncate text-xs text-muted-foreground">Member Management Console</p>
            </div>
          </Link>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div
              key={group.label}
              className="rounded-xl border-[0.75px] border-primary/25 bg-card/45 p-2 shadow-2xs"
            >
              <p className="px-2.5 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      activeProps={{
                        className: 'bg-primary text-primary-foreground font-semibold shadow-2xs',
                      }}
                      inactiveProps={{
                        className: 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground',
                      }}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer — Signed-in Steward Profile */}
        <div className="border-t border-border/50 p-3.5">
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/20">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {me.first_name} {me.last_name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground" title={roleSummary}>
                {roleSummary}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg border border-border/70 bg-white/70 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
          >
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="glass-card relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-border/60 bg-white/95">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3.5">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 text-foreground"
              >
                <img src="/logo-design.png" alt="Heritage MMC Logo" className="h-8 w-8 object-contain" />
                <div>
                  <p className="text-sm font-bold text-primary">Heritage MMC</p>
                  <p className="text-[11px] text-muted-foreground">Member Management Console</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-3 overflow-y-auto p-3.5">
              {navGroups.map((group) => (
                <div
                  key={group.label}
                  className="rounded-xl border-[0.75px] border-primary/25 bg-card/50 p-2"
                >
                  <p className="px-2.5 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          activeProps={{
                            className: 'bg-primary text-primary-foreground font-semibold',
                          }}
                          inactiveProps={{
                            className: 'text-foreground/80 hover:bg-secondary/70',
                          }}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-border/50 p-3.5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {me.first_name} {me.last_name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{roleSummary}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-white/85 px-4 py-2.5 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-white text-foreground hover:bg-secondary lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Heritage of Faith International Church</span>
                <span className="sm:hidden font-semibold text-primary">Heritage MMC</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-secondary/70 px-3 py-1 text-xs font-medium text-secondary-foreground sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>
                  {me.first_name} {me.last_name}
                </span>
                <span className="text-muted-foreground">· {roleSummary}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary lg:hidden"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
