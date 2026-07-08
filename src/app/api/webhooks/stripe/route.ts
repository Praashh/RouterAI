import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { db } from '@/server/db';
import { sendEmailNotification } from '@/actions/sendSubscriptionMail';

const webhookSecret = env.STRIPE_WEBHOOK_SECRET!;


const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('Missing stripe-signature header');
    return new NextResponse('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  
  try {
    const body = await req.text();
    
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    console.log('✅ Webhook signature verified successfully');
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    console.error('Signature received:', signature);
    console.error('Webhook secret configured:', !!webhookSecret);
    
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);

        const userId = session.metadata?.userId;
        if (!userId) {
          console.error('Missing userId in session metadata');
          return new NextResponse('Missing userId', { status: 400 });
        }

        // Idempotency: skip if already processed
        const existing = await db.subscription.findFirst({ where: { orderId: session.id } });
        if (existing) {
          console.log('Subscription already processed for session:', session.id);
          break;
        }

        await db.subscription.create({
          data: {
            userId,
            orderId: session.id,
            plan: "PRO",
            paymentId: session.invoice ? String(session.invoice) : session.id,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }
        });

        if (session.customer_details?.email) {
          await sendEmailNotification(session.customer_details.email);
        }
        break;
      }
      
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('📝 New subscription created:', subscription.id);
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('📝 Subscription updated:', subscription.id);
        console.log('Status:', subscription.status);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Subscription deleted:', subscription.id);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Payment succeeded:', invoice.id);
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💳 Payment failed:', invoice.id);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return new NextResponse('Error processing webhook', { status: 500 });
  }

  return new NextResponse('Webhook received', { status: 200 });
}