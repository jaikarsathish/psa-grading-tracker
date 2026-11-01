import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { listTeam, inviteMember, updateMemberRole, removeMember } from '@/server/psa-ops'
import { useAction } from '@/lib/actions'
import { AppShell, Card, Field, inputCls } from '@/components/psa-media-ui'

export const Route = createFileRoute('/team')({
  loader: () => listTeam(),
  component: Team,
})

function Team() {
  const members = Route.useLoaderData()
  const [form, setForm] = useState({ email: '', name: '', role: 'viewer' })
  const invite = useAction((d: typeof form) => inviteMember({ data: d }), {
    onSuccess: () => setForm({ email: '', name: '', role: 'viewer' }),
  })
  const changeRole = useAction((d: { id: string; role: string }) => updateMemberRole({ data: d }), {})
  const remove = useAction((d: { id: string }) => removeMember({ data: d }), {})

  return (
    <AppShell active="team">
      <h1 className="text-2xl font-extrabold tracking-tight">Team & roles</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Invite your team by email. Admins manage everything, editors add and import airings, viewers see dashboards and reports.
      </p>

      <Card className="mt-4">
        <h2 className="font-bold">Invite a teammate</h2>
        <fieldset disabled={!invite.ready} className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Work email *">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="colleague@nonprofit.org" />
          </Field>
          <Field label="Name">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Lee" />
          </Field>
          <Field label="Role">
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin — full access</option>
              <option value="editor">Editor — add & import</option>
              <option value="viewer">Viewer — read only</option>
            </select>
          </Field>
        </fieldset>
        {invite.error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{invite.error}</p>}
        <button disabled={invite.pending} onClick={() => invite.run(form)} className="mt-3 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
          {invite.pending ? 'Sending invite…' : 'Send invite'}
        </button>
        <p className="mt-2 text-xs text-neutral-500">Invites are stored on the roster below. Your email provider sends the actual invitation when connected.</p>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">Roster ({members.length})</h2>
        <ul className="mt-2 divide-y divide-neutral-100">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{m.name || m.email}</div>
                <div className="text-xs text-neutral-500">{m.email} · {m.status}</div>
              </div>
              <select
                aria-label={`Role for ${m.email}`}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold"
                value={m.role}
                onChange={(e) => changeRole.run({ id: m.id, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button onClick={() => remove.run({ id: m.id })} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100">
                Remove
              </button>
            </li>
          ))}
          {members.length === 0 && <li className="py-3 text-sm text-neutral-500">No teammates yet — send the first invite above.</li>}
        </ul>
        {(changeRole.error || remove.error) && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{changeRole.error || remove.error}</p>}
      </Card>
    </AppShell>
  )
}
