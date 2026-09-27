import type { ReactNode } from "react";
import { DropdownMenu as Menu } from "radix-ui";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/cn";

export function RowMenu({
  label,
  children,
  open,
  onOpenChange,
  className,
}: {
  label: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  className?: string;
}) {
  return (
    <Menu.Root open={open} onOpenChange={onOpenChange}>
      <Menu.Trigger
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          `al-pasar grid h-8 w-8 place-items-center rounded-control text-ink-4 opacity-0
          transition-colors duration-150 hover:bg-paper-sunken hover:text-ink
          focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100`,
          className,
        )}
      >
        <Ellipsis className="h-4 w-4" strokeWidth={2} aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          collisionPadding={10}
          onClick={(e) => e.stopPropagation()}
          className="z-50 w-[200px] rounded-panel bg-paper-raised p-1.5 shadow-sheet
            data-[state=open]:animate-fade data-[state=closed]:animate-fade-out"
        >
          {children}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function RowMenuItem({
  children,
  onSelect,
  danger,
  disabled,
  title,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Menu.Item
      onSelect={onSelect}
      disabled={disabled}
      title={title}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-base",
        "outline-hidden transition-colors data-[highlighted]:bg-paper-sunken",
        "data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-4 data-[disabled]:opacity-70",
        danger ? "text-fail" : "text-ink-2 data-[highlighted]:text-ink",
      )}
    >
      {children}
    </Menu.Item>
  );
}

export function RowMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-rule" />;
}
