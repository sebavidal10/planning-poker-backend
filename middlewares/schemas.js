const { z } = require('zod');

const createRoomSchema = z.object({
  body: z.object({
    slug: z.string().min(1, 'Slug is required'),
    deckType: z.enum(['fibonacci', 'modified-fibonacci', 't-shirt']).optional(),
  }),
});

const closeRoomSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Slug is required'),
  }),
});

const getRoomDetailsSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Slug is required'),
  }),
});

const deleteVotesSchema = z.object({
  params: z.object({
    votingInstanceName: z.string().min(1, 'Voting Instance Name is required'),
  }),
});

const selectVoteSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    vote: z.union([z.number(), z.string()]), // Allow string or number
    votingInstanceName: z.string().min(1, 'Voting Instance Name is required'),
  }),
});

module.exports = {
  createRoomSchema,
  closeRoomSchema,
  getRoomDetailsSchema,
  deleteVotesSchema,
  selectVoteSchema,
};
