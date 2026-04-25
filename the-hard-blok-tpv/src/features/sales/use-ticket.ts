import { useState } from "react";

export type TicketItem = {
	id: string;
	name: string;
	price: number;
	quantity: number;
	discountPercent: number;
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

			return [...prev, { ...product, quantity: 1, discountPercent: 0 }];
		});
	}

	function setItemQuantity(itemId: string, quantity: number) {
		const safeQuantity = Math.max(0, Math.floor(quantity));
		setItems((prev) =>
			prev
				.map((item) =>
					item.id === itemId ? { ...item, quantity: safeQuantity } : item,
				)
				.filter((item) => item.quantity > 0),
		);
	}

	function incrementItemQuantity(itemId: string, by = 1) {
		setItems((prev) =>
			prev.map((item) =>
				item.id === itemId
					? { ...item, quantity: item.quantity + Math.max(1, Math.floor(by)) }
					: item,
			),
		);
	}

	function decrementItemQuantity(itemId: string, by = 1) {
		const safeBy = Math.max(1, Math.floor(by));
		setItems((prev) =>
			prev
				.map((item) =>
					item.id === itemId
						? { ...item, quantity: Math.max(0, item.quantity - safeBy) }
						: item,
				)
				.filter((item) => item.quantity > 0),
		);
	}

	function applyDiscountToItem(itemId: string, discountPercent: number) {
		const safeDiscount = Math.min(100, Math.max(0, discountPercent));
		setItems((prev) =>
			prev.map((item) =>
				item.id === itemId ? { ...item, discountPercent: safeDiscount } : item,
			),
		);
	}

	function removeItem(itemId: string) {
		setItems((prev) => prev.filter((item) => item.id !== itemId));
	}

	function getLineTotal(item: TicketItem) {
		const discountedUnitPrice = item.price * (1 - item.discountPercent / 100);
		return discountedUnitPrice * item.quantity;
	}

	function getTotal() {
		return items.reduce((acc, item) => acc + getLineTotal(item), 0);
	}

	function clearTicket() {
		setItems([]);
	}

	function splitTotal(parts: number) {
		const safeParts = Math.max(1, Math.floor(parts));
		const total = getTotal();
		return total / safeParts;
	}

	return {
		items,
		addItem,
		setItemQuantity,
		incrementItemQuantity,
		decrementItemQuantity,
		applyDiscountToItem,
		removeItem,
		getLineTotal,
		getTotal,
		splitTotal,
		clearTicket,
	};
}
