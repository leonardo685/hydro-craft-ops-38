import * as React from "react"

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
  striped?: boolean;
  interactive?: boolean;
  virtualize?: boolean;
}

const Table = ({ children, className = "" }: TableProps) => {
  return (
    <div className={`w-full overflow-auto min-w-[248px] p-6 rounded-lg relative border border-gray-alpha-400 bg-background-100 ${className}`}>
      <table className="w-full border-collapse text-sm font-sans text-foreground">
        {children}
      </table>
    </div>
  );
};

const TableColgroup = ({ children }: { children: React.ReactNode }) => {
  return <colgroup>{children}</colgroup>;
};

const TableCol = ({ className }: { className?: string }) => {
  return <col className={className} />;
};

const TableHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return <thead className={`border-b border-gray-alpha-400 ${className}`}>{children}</thead>;
};

const TableBody = ({ children, striped, interactive, virtualize, className = "" }: TableBodyProps) => {
  return (
    <>
      <tbody className="table-row h-3" />
      <tbody className={`${striped ? "[&_tr:where(:nth-child(odd))]:bg-background-200" : ""}${interactive ? " [&_tr:hover]:bg-muted" : ""} ${className}`}>
        {children}
      </tbody>
    </>
  );
};

const TableRow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return <tr className={`[&_td:first-child]:rounded-l-[4px] [&_td:last-child]:rounded-r-[4px] transition-colors ${className}`}>{children}</tr>;
};

const TableHead = ({ children, className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => {
  return <th className={`h-10 px-2 align-middle font-medium text-left last:text-right ${className}`} {...props}>{children}</th>;
};

const TableCell = ({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) => {
  return <td className={`px-2 py-2.5 align-middle last:text-right ${className || ""}`} colSpan={colSpan}>{children}</td>;
};

const TableFooter = ({ children }: { children: React.ReactNode }) => {
  return <tfoot className="border-t border-gray-alpha-400">{children}</tfoot>;
};

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, children, ...props }, ref) => (
  <caption
    ref={ref}
    className={`mt-4 text-sm text-muted-foreground ${className || ""}`}
    {...props}
  >
    {children}
  </caption>
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableColgroup,
  TableCol,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
