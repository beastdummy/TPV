import type { ReactNode } from "react";

type SetupWizardNavProps = {
	onBack?: () => void;
	backLabel?: string;
	showBack: boolean;
	primaryActions?: ReactNode;
	secondaryActions?: ReactNode;
};

export function SetupWizardNav({
	onBack,
	backLabel = "Atrás",
	showBack,
	primaryActions,
	secondaryActions,
}: SetupWizardNavProps) {
	return (
		<div className="mt-6 flex flex-col gap-3 border-t pt-4">
			{secondaryActions ? (
				<div className="flex flex-wrap gap-2">{secondaryActions}</div>
			) : null}
			<div className="flex flex-wrap gap-2">
				{showBack && onBack ? (
					<button
						type="button"
						onClick={onBack}
						className="rounded-2xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
					>
						{backLabel}
					</button>
				) : null}
				{primaryActions}
			</div>
		</div>
	);
}

export function SetupCreatedList({
	title,
	items,
	emptyLabel,
}: {
	title: string;
	items: string[];
	emptyLabel: string;
}) {
	return (
		<div className="rounded-2xl border bg-muted/20 p-4">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{title}
			</p>
			{items.length === 0 ? (
				<p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
			) : (
				<ul className="mt-2 space-y-1 text-sm">
					{items.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			)}
		</div>
	);
}
