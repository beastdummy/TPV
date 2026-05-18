import { useState } from "react";

type PosOperatorPinScreenProps = {
	title: string;
	description: string;
	requireEmail?: boolean;
	isSubmitting: boolean;
	errorMessage: string | null;
	onSubmit: (pin: string, email?: string) => void;
};

export function PosOperatorPinScreen({
	title,
	description,
	requireEmail = false,
	isSubmitting,
	errorMessage,
	onSubmit,
}: PosOperatorPinScreenProps) {
	const [pin, setPin] = useState("");
	const [email, setEmail] = useState("");

	function handleDigit(digit: string) {
		setPin((prev) => `${prev}${digit}`.slice(0, 8));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit(pin, email.trim() || undefined);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl">
				<h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
				<p className="mt-2 text-sm text-muted-foreground">{description}</p>

				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					{requireEmail ? (
						<input
							type="email"
							className="w-full rounded-2xl border px-4 py-3 text-sm"
							placeholder="Email (obligatorio si el PIN está duplicado)"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="username"
						/>
					) : (
						<input
							type="email"
							className="w-full rounded-2xl border px-4 py-3 text-sm"
							placeholder="Email (opcional)"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="username"
						/>
					)}

					<input
						type="password"
						inputMode="numeric"
						autoComplete="off"
						className="w-full rounded-2xl border px-4 py-3 text-center text-2xl tracking-[0.4em]"
						placeholder="••••"
						value={pin}
						readOnly
						aria-label="PIN TPV"
					/>

					<div className="grid grid-cols-3 gap-2">
						{["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
							<button
								key={digit}
								type="button"
								onClick={() => handleDigit(digit)}
								className="rounded-2xl border py-4 text-lg font-semibold hover:bg-muted"
							>
								{digit}
							</button>
						))}
						<button
							type="button"
							onClick={() => setPin("")}
							className="rounded-2xl border py-4 text-sm font-medium hover:bg-muted"
						>
							Borrar
						</button>
						<button
							type="button"
							onClick={() => handleDigit("0")}
							className="rounded-2xl border py-4 text-lg font-semibold hover:bg-muted"
						>
							0
						</button>
						<button
							type="submit"
							disabled={isSubmitting || pin.length < 4}
							className="rounded-2xl border border-primary bg-primary py-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
						>
							{isSubmitting ? "..." : "Entrar"}
						</button>
					</div>

					{errorMessage ? (
						<p className="text-center text-sm text-red-600">{errorMessage}</p>
					) : null}
				</form>
			</div>
		</div>
	);
}
