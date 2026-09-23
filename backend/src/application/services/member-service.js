import { Member } from '../../domain/entities/member.js';
import { NotFoundError } from '../../shared/errors.js';

export class MemberService {
  constructor({ memberRepository }) {
    this.memberRepository = memberRepository;
  }

  async list() {
    return this.memberRepository.findAll();
  }

  async get(id) {
    const member = await this.memberRepository.findById(id);
    if (!member) throw new NotFoundError(`Miembro ${id} no encontrado`);
    return member;
  }

  async create(input) {
    const member = Member.create(input);
    return this.memberRepository.save(member.toJSON());
  }

  async update(id, input) {
    const existing = await this.memberRepository.findById(id);
    if (!existing) throw new NotFoundError(`Miembro ${id} no encontrado`);
    const member = Member.create({
      ...existing,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    });
    return this.memberRepository.save(member.toJSON());
  }

  async remove(id) {
    const existing = await this.memberRepository.findById(id);
    if (!existing) throw new NotFoundError(`Miembro ${id} no encontrado`);
    await this.memberRepository.delete(id);
    return { deleted: true, id };
  }
}
