import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { PosOperatorPinScreen } from "../components/pos/pos-operator-pin-screen";
import { requirePosOperationTenantForRoute } from "../features/auth/route-guards";
import { verifyPosPinForTerminalFn } from "../features/pos-session/pos-session.rpc";
import { writeStoredPosOperatorToken } from "../features/pos-session/pos-session-storage";
import {
	getPosSaleErrorMessage,
	POS_DEFAULT_TERMINAL_ID,
} from "../features/sales/build-pos-sale-payload";

export const Route = createFileRoute("/pin")({
	beforeLoad: async ({ location }) => {
		await requirePosOperationTenantForRoute(location.href);
	},
	component: PinPage,
});

function PinPage() {
	const navigate = useNavigate();
	const [pinError, setPinError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [requireEmail, setRequireEmail] = useState(false);

	async function handleSubmit(pin: string, email?: string) {
		setIsSubmitting(true);
		setPinError(null);
		try {
			const session = await verifyPosPinForTerminalFn({
				data: {
					pin,
					email,
					terminal_id: POS_DEFAULT_TERMINAL_ID,
				},
			});
			writeStoredPosOperatorToken(POS_DEFAULT_TERMINAL_ID, session.token);
			await navigate({ to: "/sales" });
		} catch (error) {
			const message = getPosSaleErrorMessage(error);
			setPinError(message);
			if (message.includes("email") || message.includes("Email")) {
				setRequireEmail(true);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<PosOperatorPinScreen
			title="Acceso TPV"
			description="Introduce tu PIN para desbloquear el terminal de ventas."
			requireEmail={requireEmail}
			isSubmitting={isSubmitting}
			errorMessage={pinError}
			onSubmit={handleSubmit}
		/>
	);
}
