import {redirect} from 'react-router';
import type {Route} from './+types/subscribers.checkout.$hash';

/**
 * `/subscribers/checkout/<хеш>` - писмо, което води право на касата
 * (променливата `{$checkout_url}` на платформата).
 *
 * Същата история като `/subscribers/cart/<хеш>` - виж нея за пълния разказ.
 * Разликата е само целта: `/checkout-start` издава пресен adopt адрес и
 * подава кампанията на платформата. Празна количка там се връща на `/cart`
 * сама, тоест и този случай е покрит.
 */
export async function loader(_args: Route.LoaderArgs) {
  throw redirect('/checkout-start', 302);
}
