import {
  Component,
  computed,
  signal,
  effect,
  inject,
  Injector,
} from '@angular/core';

import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { Task } from '../../models/task.model';
import { FilterStatus } from '../../models/enums/filter-status.enum';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  tasks = signal<Task[]>([]);

  ngOnInit(): void {
    const storage = localStorage.getItem('mydayapp-js');
    if (storage) {
      const tasks = JSON.parse(storage);
      this.tasks.set(tasks);
    }
    this.trackTask();
  }

  injector = inject(Injector);

  /**
   *  Tracks task status change, saves tasks to localStorage
   */
  trackTask() {
    effect(
      () => {
        const tasks = this.tasks();
        localStorage.setItem('mydayapp-js', JSON.stringify(tasks));
      },
      { injector: this.injector }
    );
  }

  /**
   * Clears the input where the new task is received.
   * @returns {void}
   */
  cleanInput(): void {
    this.newTaskCtrl.setValue('');
  }

  newTaskCtrl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^(?!\s*$).+/)],
  });

  /**
   * Validates the user input. If it is correct, it proceeds to call the function that adds the task and clears the input.
   * If invalid, returns and clears the input.
   * @returns {void}
   */
  processInput(): void {
    const cleanedValue = this.newTaskCtrl.value.trim();

    if (this.newTaskCtrl.invalid || cleanedValue.length < 3) {
      this.cleanInput();
      this.showAlert(
        'Advertencia',
        'Por favor, proporciona un título para la tarea.',
        'warning'
      );
      return;
    }

    this.addTask(cleanedValue);
    this.cleanInput();
  }

  /**
   * Creates a new list of tasks and inserts the new one received by the input in the last position.
   * @param {string} title - The title of the new task.
   * @returns {void}
   */
  addTask(title: string): void {
    const newTask = {
      id: Date.now(),
      title: title,
      completed: false,
    };
    this.tasks.update((tasks) => [...tasks, newTask]);
  }

  /**
   * Removes a task from the task list.
   * @param {number} taskId - the id of the task to be deleted.
   * @returns {void}
   */
  deleteTask(taskId: number): void {
    this.tasks.update((tasks): Task[] => {
      return tasks.filter((task) => task.id !== taskId);
    });
  }

  /**
   * Toggles the completed property associated with a task.
   * @param {number} taskId - The id of the task to which the completed value is to be changed.
   * @returns {void}
   */
  toggleChecked(taskId: number): void {
    this.tasks.update((tasks): Task[] =>
      tasks.map(
        (task): Task =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  }

  /**
   * Count the tasks that are completed.
   * @returns {number} The number of completed tasks.
   */
  toDoCounter(): number {
    return this.tasks().filter((task): boolean => task.completed).length;
  }

  toDoCounterByFilters = computed((): number => {
    return this.tasksByFilter().length;
  });

  /**
   * Displays an alert with the specified parameters.
   * @param {string} title - Alert title.
   * @param {string} text - Alert message text.
   * @param {SweetAlertIcon} icon - Type of alert icon ('success', 'error', 'warning', 'info', 'question').
   * @returns {void}
   */
  showAlert(
    title: string,
    text: string,
    icon: 'success' | 'error' | 'warning' | 'info' | 'question'
  ): void {
    Swal.fire({
      icon: icon,
      title: title,
      text: text,
      showConfirmButton: false,
      timer: 3000,
    });
  }

  /**
   * Updates the selected task in edit mode
   * @param {number} taskId of the task to be modified
   * @description Cannot edit completed tasks (status -> completed)
   * @returns {void}
   */
  updateTaskEditingMode(taskId: number): void {
    debugger;
    this.tasks.update((tasks): Task[] =>
      tasks.map((task): Task => {
        if (task.id === taskId && !task.completed) {
          return { ...task, editing: true };
        } else if (task.editing) {
          return { ...task, editing: false };
        }
        return task;
      })
    );
  }

  /**
   * Saves the new title of a modified task
   * @param {number} taskId of the task to be modified
   * @param {Event} event Event containing the new title
   * @returns {void}
   */
  updateTaskTitle(taskId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newTitle = input.value.trim();

    if (!newTitle) {
      this.showAlert(
        'Advertencia',
        'El título de la tarea no puede estar vacío.',
        'warning'
      );
      return;
    }

    this.tasks.update((tasks): Task[] =>
      tasks.map(
        (task): Task =>
          task.id === taskId
            ? { ...task, title: newTitle, editing: false }
            : task
      )
    );
  }

  currentFilter = signal<FilterStatus>(FilterStatus.ALL);

  filtersStatus = FilterStatus;

  changeFilter(filter: FilterStatus): void {
    this.currentFilter.set(filter);
  }

  tasksByFilter = computed((): Task[] => {
    const filter = this.currentFilter();
    const tasks = this.tasks();

    const filterMap: Record<FilterStatus, () => Task[]> = {
      [FilterStatus.PENDING]: () =>
        tasks.filter((task): boolean => !task.completed),
      [FilterStatus.COMPLETED]: () =>
        tasks.filter((task): boolean => task.completed),
      [FilterStatus.ALL]: () => tasks,
    };

    return filterMap[filter]();
  });

  /**
   * Deletes completed tasks
   * @returns {void}
   */
  deleteTaskCompleted(): void {
    this.tasks.update((tasks): Task[] => {
      return tasks.filter((task) => !task.completed);
    });
  }
}
