import { useMutation } from '@tanstack/react-query';
import { loginSchema, registerSchema } from '@ks/validation';
import { Mic } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { accessToken, setSession } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    organizationName: '',
  });
  const [validation, setValidation] = useState<string | null>(null);
  const isRegister = mode === 'register';

  const mutation = useMutation({
    mutationFn: () =>
      isRegister
        ? api.auth.register(registerSchema.parse(form))
        : api.auth.login(loginSchema.parse(form)),
    onSuccess: setSession,
  });

  if (accessToken) return <Navigate to="/" replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = (isRegister ? registerSchema : loginSchema).safeParse(form);
    if (!parsed.success) return setValidation(parsed.error.issues[0].message);
    setValidation(null);
    mutation.mutate();
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Mic />
          </span>
          <h1 className="text-2xl font-bold">{isRegister ? 'Crea tu espacio' : 'Bienvenido'}</h1>
          <p className="text-sm text-muted">Panel de administración de Karaoke Smart</p>
        </div>
        {isRegister && (
          <>
            <Input placeholder="Tu nombre" autoComplete="name" {...field('displayName')} />
            <Input placeholder="Nombre del local u organización" {...field('organizationName')} />
          </>
        )}
        <Input type="email" placeholder="Correo" autoComplete="email" {...field('email')} />
        <Input
          type="password"
          placeholder="Contraseña"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          {...field('password')}
        />
        {(validation || mutation.error) && (
          <p role="alert" className="text-sm text-danger">
            {validation ?? errorMessage(mutation.error)}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Entrar'}
        </Button>
        <p className="text-center text-sm text-muted">
          {isRegister ? '¿Ya tienes cuenta? ' : '¿Primera vez? '}
          <Link to={isRegister ? '/login' : '/register'} className="text-foreground underline">
            {isRegister ? 'Entrar' : 'Crear cuenta'}
          </Link>
        </p>
      </form>
    </main>
  );
}
