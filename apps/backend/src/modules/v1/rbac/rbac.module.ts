import { Global, Module } from "@nestjs/common"
import { AuthModule } from "@thallesp/nestjs-better-auth"

import { RbacController } from "./rbac.controller"
import { RbacService } from "./rbac.service"

@Global()
@Module({
	imports: [AuthModule],
	controllers: [RbacController],
	providers: [RbacService],
	exports: [RbacService],
})
export class RbacModule {}
