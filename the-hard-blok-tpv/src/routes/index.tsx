import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div className="flex h-screen items-center justify-center bg-background">
			<h1 className="text-3xl font-bold">The Hard Blok TPV 🚀</h1>
		</div>
	);
}
