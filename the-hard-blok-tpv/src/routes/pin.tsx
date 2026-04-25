import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/pin")({
	component: PinPage,
});

function PinPage() {
	return (
		<div className="flex h-screen items-center justify-center bg-background">
			<h1 className="text-2xl font-bold">PIN Access</h1>
		</div>
	);
}
