import { Injectable, NotFoundException } from '@nestjs/common'
import type { ModelPriceVersion, ModelPricingResponse, UpdateModelPricingInput } from '@gateway/contracts'
import { DataSource } from 'typeorm'
import { ModelEntity } from '../database/entities/model.entity'
import { ModelPriceVersionEntity } from '../database/entities/model-price-version.entity'

@Injectable()
export class ModelPricingService {
  constructor(private readonly dataSource: DataSource) {}

  async detail(modelId: string): Promise<ModelPricingResponse> {
    const [model, versions] = await Promise.all([
      this.dataSource.getRepository(ModelEntity).findOne({ where: { id: modelId } }),
      this.dataSource.getRepository(ModelPriceVersionEntity).find({ where: { modelId }, order: { effectiveFrom: 'DESC' } }),
    ])
    if (!model) throw new NotFoundException('模型不存在')
    return this.mapResponse(model, versions)
  }

  async publish(modelId: string, actorUserId: string, input: UpdateModelPricingInput): Promise<ModelPricingResponse> {
    await this.dataSource.transaction(async (manager) => {
      const models = manager.getRepository(ModelEntity)
      const versions = manager.getRepository(ModelPriceVersionEntity)
      const model = await models.createQueryBuilder('model')
        .setLock('pessimistic_write')
        .where('model.id = :modelId', { modelId })
        .getOne()
      if (!model) throw new NotFoundException('模型不存在')

      const now = new Date()
      const discountFactor = 1 - input.discountPercent / 100
      const inputPrice = this.money(input.originalInputPrice * discountFactor)
      const outputPrice = input.originalOutputPrice === null || input.originalOutputPrice === undefined
        ? null
        : this.money(input.originalOutputPrice * discountFactor)

      await versions.createQueryBuilder()
        .update(ModelPriceVersionEntity)
        .set({ effectiveTo: now })
        .where('model_id = :modelId AND effective_to IS NULL', { modelId })
        .execute()

      await versions.save(versions.create({
        modelId,
        inputPrice: inputPrice.toFixed(4),
        outputPrice: outputPrice === null ? null : outputPrice.toFixed(4),
        originalInputPrice: input.originalInputPrice.toFixed(4),
        originalOutputPrice: input.originalOutputPrice === null || input.originalOutputPrice === undefined ? null : input.originalOutputPrice.toFixed(4),
        discountPercent: input.discountPercent.toFixed(2),
        priceUnit: input.priceUnit,
        effectiveFrom: now,
        effectiveTo: null,
        createdByUserId: actorUserId,
      }))

      model.inputPrice = inputPrice.toFixed(4)
      model.outputPrice = outputPrice === null ? null : outputPrice.toFixed(4)
      model.originalInputPrice = input.originalInputPrice.toFixed(4)
      model.originalOutputPrice = input.originalOutputPrice === null || input.originalOutputPrice === undefined ? null : input.originalOutputPrice.toFixed(4)
      model.discountPercent = input.discountPercent.toFixed(2)
      model.priceUnit = input.priceUnit
      model.priceEffectiveFrom = now
      await models.save(model)
    })
    return this.detail(modelId)
  }

  private money(value: number): number { return Math.round((value + Number.EPSILON) * 10_000) / 10_000 }

  private mapVersion(version: ModelPriceVersionEntity): ModelPriceVersion {
    return {
      id: version.id,
      modelId: version.modelId,
      inputPrice: Number(version.inputPrice),
      outputPrice: version.outputPrice === null ? null : Number(version.outputPrice),
      originalInputPrice: Number(version.originalInputPrice),
      originalOutputPrice: version.originalOutputPrice === null ? null : Number(version.originalOutputPrice),
      discountPercent: Number(version.discountPercent),
      priceUnit: version.priceUnit,
      effectiveFrom: version.effectiveFrom.toISOString(),
      effectiveTo: version.effectiveTo?.toISOString() ?? null,
      createdAt: version.createdAt.toISOString(),
    }
  }

  private mapResponse(model: ModelEntity, versions: ModelPriceVersionEntity[]): ModelPricingResponse {
    return {
      modelId: model.id,
      modelName: model.name,
      modelSlug: model.publicId,
      inputPrice: Number(model.inputPrice),
      outputPrice: model.outputPrice === null ? null : Number(model.outputPrice),
      originalInputPrice: Number(model.originalInputPrice),
      originalOutputPrice: model.originalOutputPrice === null ? null : Number(model.originalOutputPrice),
      discountPercent: Number(model.discountPercent),
      priceUnit: model.priceUnit,
      effectiveFrom: model.priceEffectiveFrom.toISOString(),
      versions: versions.map((version) => this.mapVersion(version)),
    }
  }
}
