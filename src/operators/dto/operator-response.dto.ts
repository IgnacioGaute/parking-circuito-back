import { Role } from '../../common/enums/role.enum';

export class OperatorResponseDto {
  id!: string;
  name!: string;
  initials!: string;
  role!: Role;
  onDuty!: boolean;

  static fromEntity(operator: {
    id: string;
    name: string;
    role: Role;
    onDuty: boolean;
  }): OperatorResponseDto {
    const dto = new OperatorResponseDto();
    dto.id = operator.id;
    dto.name = operator.name;
    dto.role = operator.role;
    dto.onDuty = operator.onDuty;
    dto.initials = operator.name
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
    return dto;
  }
}
