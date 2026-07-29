import { Download, FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";

type ExportMenuProps = {
  onExportPDF?: () => Promise<void>;
  onExportCSV?: () => Promise<void>;
  className?: string;
};

export function ExportMenu({ onExportPDF, onExportCSV, className }: ExportMenuProps) {
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  const handleExportPDF = async () => {
    if (!onExportPDF) return;
    setExportingPDF(true);
    try {
      await onExportPDF();
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    if (!onExportCSV) return;
    setExportingCSV(true);
    try {
      await onExportCSV();
    } finally {
      setExportingCSV(false);
    }
  };

  return (
    <Card className={`glass ${className ?? ""}`}>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Export Analytics</p>
            <p className="text-xs text-muted-foreground">Download predictions and insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={exportingPDF || !onExportPDF}
            onClick={handleExportPDF}
            size="sm"
            type="button"
            variant="outline"
          >
            {exportingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Button
            disabled={exportingCSV || !onExportCSV}
            onClick={handleExportCSV}
            size="sm"
            type="button"
            variant="outline"
          >
            {exportingCSV ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}