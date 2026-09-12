import { DataTraceSection } from './DataTraceSection';
import { OperationTraceSection } from './OperationTraceSection';
import { BatchQrSection } from './BatchQrSection';

export function TraceabilityTab() {
  return (
    <div className="space-y-4">
      <DataTraceSection />
      <OperationTraceSection />
      <BatchQrSection />
    </div>
  );
}
