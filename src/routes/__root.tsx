import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 font-display text-xl uppercase tracking-wider">Fora de campo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Essa página não existe ou foi movida do gramado.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            Voltar pra Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PeladaPro — Liga, Campos e Batalhas do Futebol Amador" },
      { name: "description", content: "Plataforma completa para futebol amador: agendamento de campos, desafios entre times e gestão de ligas competitivas." },
      { property: "og:title", content: "PeladaPro — Liga, Campos e Batalhas do Futebol Amador" },
      { name: "twitter:title", content: "PeladaPro — Liga, Campos e Batalhas do Futebol Amador" },
      { property: "og:description", content: "Plataforma completa para futebol amador: agendamento de campos, desafios entre times e gestão de ligas competitivas." },
      { name: "twitter:description", content: "Plataforma completa para futebol amador: agendamento de campos, desafios entre times e gestão de ligas competitivas." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/07d3117c-26fc-41df-a35a-5323e0334e4c/id-preview-8449783e--f03d0180-c43f-47ba-9b22-a8b83db1125d.lovable.app-1778818823860.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/07d3117c-26fc-41df-a35a-5323e0334e4c/id-preview-8449783e--f03d0180-c43f-47ba-9b22-a8b83db1125d.lovable.app-1778818823860.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground">
        <PaymentTestModeBanner />
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </AuthProvider>
  );
}
