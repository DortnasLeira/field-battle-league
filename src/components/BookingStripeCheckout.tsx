import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createBookingCheckout } from "@/lib/bookings.functions";

interface Props {
  subFieldId: string;
  scheduledAt: string;
  teamId?: string;
}

export function BookingStripeCheckout({ subFieldId, scheduledAt, teamId }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const secret = await createBookingCheckout({
      data: {
        subFieldId,
        scheduledAt,
        teamId,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=booking`,
        environment: getStripeEnvironment(),
      },
    });
    if (!secret) throw new Error("Falha ao iniciar checkout");
    return secret;
  };

  return (
    <div id="booking-checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
