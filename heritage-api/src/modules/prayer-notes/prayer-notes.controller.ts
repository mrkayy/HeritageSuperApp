import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodBody } from '../../platform/http/errors.js';
import { CurrentAuth, RequireCapability, type AuthContext } from '../identity/auth.guard.js';
import { PrayerNotesService } from './prayer-notes.service.js';

const UpdatePrayerNoteBody = z.object({
  content: z.string().trim().min(1, 'Prayer request cannot be empty').max(5000),
});

@Controller('prayer-notes')
export class PrayerNotesController {
  constructor(private readonly prayerNotes: PrayerNotesService) {}

  @Get()
  @RequireCapability('prayer_notes.manage')
  list() {
    return this.prayerNotes.list();
  }

  @Patch(':id')
  @RequireCapability('prayer_notes.manage')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodBody(UpdatePrayerNoteBody)) body: z.infer<typeof UpdatePrayerNoteBody>,
  ) {
    return this.prayerNotes.update(auth, id, body.content);
  }

  @Post(':id/send-pastor')
  @RequireCapability('prayer_notes.email_pastor')
  @HttpCode(200)
  sendToPastor(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.prayerNotes.sendToPastor(auth, id);
  }
}
