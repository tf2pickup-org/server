import { Injectable } from '@nestjs/common';
import { classToPlain } from 'class-transformer';
import { LinkedProfile } from '../types/linked-profile';
import { LinkedProfileProviderName } from '../types/linked-profile-provider-name';

interface LinkedProfileProvider {
  name: LinkedProfileProviderName;
  fetchProfile: (playerId: string) => Promise<any> | any;
}

@Injectable()
export class LinkedProfilesService {
  private linkedProfileProviders: LinkedProfileProvider[] = [];

  registerLinkedProfileProvider(linkedProfileProvider: LinkedProfileProvider) {
    this.linkedProfileProviders.push(linkedProfileProvider);
  }

  async getLinkedProfiles(playerId: string): Promise<LinkedProfile[]> {
    return (
      await Promise.all(
        this.linkedProfileProviders.map(async (provider) => {
          try {
            const profile = await provider.fetchProfile(playerId);
            return { ...classToPlain(profile), provider: provider.name };
          } catch (_error) {
            return null;
          }
        }),
      )
    ).filter((profile) => profile !== null);
  }
}
