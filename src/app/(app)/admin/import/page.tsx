import { ImportTool } from "@/components/admin/import-tool";

export const dynamic = "force-dynamic";

export default function AdminImportPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Importer du contenu</h2>
      <ImportTool />
    </div>
  );
}
