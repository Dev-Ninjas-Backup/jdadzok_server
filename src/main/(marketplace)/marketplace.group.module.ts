import { Module } from "@nestjs/common";
import { FavouritelistModule } from "./favouritelist/favouritelist.module";
import { HideModule } from "./hide/hide.module";

import { ProductCategoryModule } from "./product-category/product-category.module";

import { ProductModule } from "./product/product.module";
import { OrderModule } from "./order/order.module";
// import { PaymentsModule } from "./payment/payments.module";
@Module({
    imports: [
        ProductModule,
        FavouritelistModule,
        HideModule,
        ProductCategoryModule,
        OrderModule,
        // PaymentsModule,
    ],
    controllers: [],
    providers: [],
    exports: [],
})
export class MarketplacesGroupModule {}
