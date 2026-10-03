import ActionItemsTable from '@/components/ActionItemsTable';
import { CheckSquare }  from 'lucide-react';

export default function ActionItemsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-600/20 border border-green-500/30 flex items-center justify-center shrink-0">
          <CheckSquare className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Action Items</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            All tasks extracted from your documents by Gemini. Update status directly in the table.
          </p>
        </div>
      </div>
      <ActionItemsTable />
    </div>
  );
}
