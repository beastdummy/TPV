import { useState } from "react";

export type TicketItem = {
	id: string;
	name: string;
	price: number;
	quantity: number;
};

export function useTicket() {
	const [items, setItems] = useState<TicketItem[]>([]);

	function addItem(product: { id: string; name: string; price: number }) {
		setItems((prev) => {
			const existing = prev.find((i) => i.id === product.id);

			if (existing) {
				return prev.map((i) =>
					i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
				);
			}

			return [...prev, { ...product, quantity: 1 }];
		});
	}

	function getTotal() {
		return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
	}

	function clearTicket() {
		setItems([]);
	}

	return {
		items,
		addItem,
		getTotal,
		clearTicket,
	};
}
