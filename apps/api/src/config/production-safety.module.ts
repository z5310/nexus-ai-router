import { Module } from '@nestjs/common'
import { ProductionDatabaseSafetyService } from './production-database-safety'

/** 将生产数据库检查收口成独立模块，业务模块不需要感知演示身份的历史兼容逻辑。 */
@Module({ providers: [ProductionDatabaseSafetyService] })
export class ProductionSafetyModule {}
