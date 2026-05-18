import type { FormEvent } from "react";

export type ConfirmBusinessFormValues = {
	name: string;
	legal_name: string;
	timezone: string;
};

export async function submitConfirmBusinessStep(
	event: Pick<FormEvent<HTMLFormElement>, "preventDefault">,
	values: ConfirmBusinessFormValues,
	onSubmit: (values: ConfirmBusinessFormValues) => void | Promise<void>,
) {
	event.preventDefault();
	await onSubmit(values);
}

type ConfirmBusinessStepFormProps = {
	values: ConfirmBusinessFormValues;
	error: string | null;
	isBusy: boolean;
	onChange: (values: ConfirmBusinessFormValues) => void;
	onSubmit: (values: ConfirmBusinessFormValues) => void | Promise<void>;
};

export function ConfirmBusinessStepForm({
	values,
	error,
	isBusy,
	onChange,
	onSubmit,
}: ConfirmBusinessStepFormProps) {
	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		void submitConfirmBusinessStep(event, values, onSubmit).catch(() => {
			// El padre (runStep) gestiona errores y mensajes visibles.
		});
	}

	return (
		<form className="space-y-4" onSubmit={handleSubmit} noValidate>
			{error ? (
				<p
					role="alert"
					className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
				>
					{error}
				</p>
			) : null}

			<label className="block space-y-1 text-sm">
				<span className="font-medium">Nombre comercial</span>
				<input
					required
					minLength={2}
					className="w-full rounded-2xl border px-3 py-2"
					value={values.name}
					onChange={(event) =>
						onChange({ ...values, name: event.target.value })
					}
				/>
			</label>

			<label className="block space-y-1 text-sm">
				<span className="font-medium">Razón social (opcional)</span>
				<input
					className="w-full rounded-2xl border px-3 py-2"
					value={values.legal_name}
					onChange={(event) =>
						onChange({ ...values, legal_name: event.target.value })
					}
				/>
			</label>

			<button
				type="submit"
				disabled={isBusy}
				className="rounded-2xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
			>
				{isBusy ? "Guardando..." : "Confirmar y continuar"}
			</button>
		</form>
	);
}
