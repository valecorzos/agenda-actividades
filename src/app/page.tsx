import Image from "next/image";
import { AgendaView } from "@/components/agenda/agenda-view";
import { ProjectsPanel } from "@/components/projects/projects-panel";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8">
      <header className="flex items-center gap-4">
        <Image
          src="/GrupoSerex.svg"
          alt="Grupo Serex"
          width={28}
          height={28}
          priority
        />
        <div className="self-stretch w-px bg-border" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Agenda de Actividades
          </h1>
          <p className="text-sm text-muted-foreground">
            Seguimiento diario de Valentina y Juan
          </p>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <AgendaView />
        <ProjectsPanel />
      </div>
    </main>
  );
}
