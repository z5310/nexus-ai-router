import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthUser, UserListResponse, UserSummaryResponse } from '@gateway/contracts'
import { JwtAuthGuard, type AuthenticatedRequest } from './auth.guard'
import { CreateUserDto, ListUsersQuery, UpdateUserDto } from './dto/users.dto'
import { Roles, RolesGuard } from './roles.guard'
import { UsersService } from './users.service'

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get user lifecycle totals' })
  summary(): Promise<UserSummaryResponse> { return this.users.summary() }

  @Get()
  @ApiOperation({ summary: 'Search and filter users' })
  list(@Query() query: ListUsersQuery): Promise<UserListResponse> { return this.users.list(query) }

  @Get(':id')
  detail(@Param('id') id: string): Promise<AuthUser> { return this.users.detail(id) }

  @Post()
  create(@Body() input: CreateUserDto): Promise<AuthUser> { return this.users.create(input) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateUserDto, @Req() request: AuthenticatedRequest): Promise<AuthUser> {
    return this.users.update(id, input, request.user.sub)
  }
}
