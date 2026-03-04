import { getSiteContent } from "@/lib/services/content.service";
import AdminContentForm from "./form";

export default async function AdminContentPage() {
  const content = await getSiteContent();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-black tracking-tight">Editar Home</h1>
      <p className="text-slate-600">Actualizá hero, banners y newsletter de la landing principal.</p>
      <AdminContentForm initialContent={content.home} />
    </section>
  );
}
