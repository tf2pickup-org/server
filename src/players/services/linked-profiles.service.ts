import { Injectable } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { PlayerId } from '../types/player-id';
import { LinkedProfile } from '../types/linked-profile';
import { LinkedProfileProviderName } from '../types/linked-profile-provider-name';

interface LinkedProfileProvider {
  name: LinkedProfileProviderName;
  fetchProfile: (playerId: PlayerId) => Promise<unknown>;
}

@Injectable()
export class LinkedProfilesService {
  private linkedProfileProviders: LinkedProfileProvider[] = [];

  registerLinkedProfileProvider(linkedProfileProvider: LinkedProfileProvider) {
    this.linkedProfileProviders.push(linkedProfileProvider);
  }

  async getLinkedProfiles(playerId: PlayerId): Promise<LinkedProfile[]> {
    return (
      await Promise.all(
        this.linkedProfileProviders.map(async (provider) => {
          try {
            const profile = await provider.fetchProfile(playerId);
            return { ...instanceToPlain(profile), provider: provider.name };
          } catch (_error) {
            return undefined;
          }
        }),
      )
    ).filter((profile): profile is LinkedProfile => Boolean(profile));
  }
}
