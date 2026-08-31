import Image from "next/image";
import { DocumentosProvider } from "@/components/documentos/documentos-provider";
import { DocumentosView } from "@/components/documentos/documentos-view";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
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
            Proyectos de Innovación
          </h1>
          <p className="text-sm text-muted-foreground">
            Estado de los entregables por línea de negocio y proceso
          </p>
        </div>
      </header>

      <DocumentosProvider>
        <DocumentosView />
      </DocumentosProvider>
    </main>
  );
}
