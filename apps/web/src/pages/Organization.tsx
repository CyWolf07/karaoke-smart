import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

export function OrganizationPage() {
  const { organizations } = useAuth();
  const orgs = useQuery({ queryKey: ['organizations'], queryFn: api.organizations.list });
  const list = orgs.data ?? organizations;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-8 text-2xl font-bold">Organización</h1>
      {orgs.isError && <p className="mb-4 text-sm text-danger">{errorMessage(orgs.error)}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((o) => (
          <div key={o.id} className="rounded-lg border border-border bg-surface-raised p-6">
            <h2 className="mb-4 font-semibold">{o.name}</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Identificador</dt>
                <dd className="truncate font-mono">{o.slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Tu rol</dt>
                <dd className="capitalize">{o.role}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
