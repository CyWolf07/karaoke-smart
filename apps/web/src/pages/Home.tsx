import { LayoutDashboard, Mic, Smartphone, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';

const OPTIONS = [
  {
    to: '/join',
    icon: Smartphone,
    title: 'Soy participante',
    text: 'Desde tu celular: elige tu apodo y únete a la sala.',
  },
  {
    to: '/admin',
    icon: LayoutDashboard,
    title: 'Panel de administración',
    text: 'Para el anfitrión: estado del sistema y organización.',
  },
  {
    to: '/screen',
    icon: Tv,
    title: 'Pantalla principal',
    text: 'Para el televisor o proyector del evento.',
  },
] as const;

export function HomePage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col justify-center px-4 py-10">
      <div className="mb-10 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <Mic size={24} />
        </span>
        <div>
          <h1 className="text-3xl font-bold">Karaoke Smart</h1>
          <p className="text-muted">¿Cómo vas a usar este dispositivo?</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {OPTIONS.map(({ to, icon: Icon, title, text }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-lg border border-border bg-surface-raised pressable p-6 hover:border-primary"
          >
            <Icon className="mb-4 text-primary" size={28} />
            <h2 className="mb-1 font-semibold">{title}</h2>
            <p className="text-sm text-muted">{text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
