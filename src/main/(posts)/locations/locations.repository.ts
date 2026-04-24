import { Injectable } from "@nestjs/common";
import { HelperTx } from "@type/index";
import { CreateLocationDto } from "./dto/create.location.dto";

@Injectable()
export class LocationRepository {
    constructor() {}

    async txStore(tx: HelperTx, data: CreateLocationDto) {
        return await tx.location.create({ data });
    }
}
