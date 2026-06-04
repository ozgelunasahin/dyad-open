-- Add per-conversation capacity: the maximum number of joiners (accepted
-- meetings) allowed on any one time slot of the conversation.
--
--   NULL  = grandfathered "unlimited" — legacy rows published before this
--           shipped. New publishes must set a value (enforced in the app layer,
--           PromptCommandService.publish — not in publish_prompt).
--   1     = one-on-one (a single accepted meeting per slot).
--   2..7  = small group (up to 8 people total including the author).
--
-- Capacity is set at first publish and is immutable thereafter (mirrors
-- audience_scope), so no edit path can leave a slot with more accepted
-- meetings than its capacity.

ALTER TABLE prompts
  ADD COLUMN capacity INTEGER
  CONSTRAINT prompts_capacity_range CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 7);

COMMENT ON COLUMN prompts.capacity IS
  'Max joiners (accepted meetings) per time slot. NULL = legacy unlimited; 1 = one-on-one; 2-7 = group (up to 8 total incl. author). Set at first publish, immutable thereafter.';
