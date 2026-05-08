const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-xs text-amber-900">
      Pagamentos no preview estão em modo teste. Use o cartão{" "}
      <span className="font-mono font-semibold">4242 4242 4242 4242</span> com qualquer validade futura e CVC.
    </div>
  );
}
