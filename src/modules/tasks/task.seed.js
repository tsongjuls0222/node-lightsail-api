export async function seedDemoTasks(taskRepository) {
  const now = new Date().toISOString();

  await taskRepository.create({
    title: 'Update npm dependencies',
    description: '',
    status: 'done',
    completedAt: now,
  });
  await taskRepository.create({
    title: 'Review open pull requests',
    description: '',
    status: 'in_progress',
    completedAt: null,
  });
  await taskRepository.create({
    title: 'Move task store to MySQL',
    description: '',
    status: 'todo',
    completedAt: null,
  });
}
