-- Development seed for the first server-scored knowledge check.
-- Run only after applying the M2 migration. Educational demo material only.
insert into public.lessons (id, version, title, published, content, answer_key, xp_reward)
values (
  'spread-basics', '1', 'The hidden cost: spread', true,
  '{"objective":"Distinguish spread from commission and leverage.","question":"What does the spread represent?","choices":[{"id":"commission","label":"A fixed fee charged by the broker"},{"id":"spread","label":"The difference between bid and ask"},{"id":"leverage","label":"The amount borrowed to amplify exposure"}],"passThreshold":80}'::jsonb,
  '[{"questionId":"spread-definition","answerId":"spread"}]'::jsonb,
  30
)
on conflict (id, version) do update set
  title = excluded.title, published = excluded.published, content = excluded.content,
  answer_key = excluded.answer_key, xp_reward = excluded.xp_reward;
