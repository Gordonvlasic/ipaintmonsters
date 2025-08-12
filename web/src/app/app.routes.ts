import { Routes } from '@angular/router';
import { HomepageComponent } from './pages/homepage/homepage';
import { CartComponent } from './pages/cart/cart';
import { CheckoutComponent } from './pages/checkout/checkout';
import { DetailComponent } from './pages/detail/detail';
import { LayoutComponent } from './pages/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: HomepageComponent }, // ← swap to homepage
      { path: 'art/:slug', component: DetailComponent },
      { path: 'cart', component: CartComponent },
      { path: 'checkout', component: CheckoutComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
