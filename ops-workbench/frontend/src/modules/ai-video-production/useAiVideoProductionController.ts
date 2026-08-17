import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { Asset, GenerationTask, ProductProject, Shot, WorkbenchStore } from "./types";

const emptyStore: WorkbenchStore = { projects: [], assets: [], shots: [], tasks: [] };

export function useAiVideoProductionController() {
  const [store, setStore] = useState<WorkbenchStore>(emptyStore);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("空闲");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await api<WorkbenchStore>("/ai-video/workbench");
      setStore(next);
      setSelectedProjectId(current => current || next.projects[0]?.id || "");
      setMessage("数据已同步");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedProject = useMemo(
    () => store.projects.find(project => project.id === selectedProjectId) || store.projects[0] || null,
    [selectedProjectId, store.projects],
  );
  const selectedAssets = useMemo(
    () => store.assets.filter(asset => asset.project_id === selectedProject?.id),
    [selectedProject?.id, store.assets],
  );
  const selectedShots = useMemo(
    () => store.shots.filter(shot => shot.project_id === selectedProject?.id).sort((a, b) => a.order - b.order),
    [selectedProject?.id, store.shots],
  );
  const selectedTasks = useMemo(
    () => store.tasks.filter(task => task.project_id === selectedProject?.id),
    [selectedProject?.id, store.tasks],
  );

  function actionError(reason: unknown, fallback: string): never {
    const next = reason instanceof Error ? reason.message : fallback;
    setError(next);
    setMessage(next);
    throw reason;
  }

  async function createProject(payload: Pick<ProductProject, "name" | "product_name" | "selling_points" | "audience" | "tone">) {
    setError("");
    setLoading(true);
    try {
      const project = await api<ProductProject>("/ai-video/projects", { method: "POST", body: JSON.stringify(payload) });
      setSelectedProjectId(project.id);
      setMessage("项目已创建");
      await refresh();
      return project;
    } catch (reason) {
      actionError(reason, "项目创建失败");
    } finally {
      setLoading(false);
    }
  }

  async function draftShots() {
    if (!selectedProject) return;
    setError("");
    setLoading(true);
    try {
      const shots = await api<Shot[]>("/ai-video/director/draft-shots", { method: "POST", body: JSON.stringify({ project_id: selectedProject.id }) });
      setMessage("导演分镜已生成");
      await refresh();
      return shots;
    } catch (reason) {
      actionError(reason, "导演分镜生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function addAsset(kind: string, name: string, notes: string) {
    if (!selectedProject) return;
    setError("");
    setLoading(true);
    try {
      const asset = await api<Asset>("/ai-video/assets", {
        method: "POST",
        body: JSON.stringify({ project_id: selectedProject.id, kind, name, notes }),
      });
      setMessage("资产已登记");
      await refresh();
      return asset;
    } catch (reason) {
      actionError(reason, "资产登记失败");
    } finally {
      setLoading(false);
    }
  }

  async function uploadAsset(kind: string, name: string, notes: string, file: File) {
    if (!selectedProject) return;
    setError("");
    setLoading(true);
    try {
      const form = new FormData();
      form.set("project_id", selectedProject.id);
      form.set("kind", kind);
      form.set("name", name);
      form.set("notes", notes);
      form.set("file", file);
      const asset = await api<Asset>("/ai-video/assets/upload", { method: "POST", body: form });
      setMessage("资产文件已上传");
      await refresh();
      return asset;
    } catch (reason) {
      actionError(reason, "资产文件上传失败");
    } finally {
      setLoading(false);
    }
  }

  async function createTask(workflowName: string, prompt: string) {
    if (!selectedProject) return;
    setError("");
    setLoading(true);
    try {
      const task = await api<GenerationTask>("/ai-video/generation/tasks", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProject.id,
          engine: "comfyui",
          workflow_name: workflowName,
          prompt,
          input_asset_ids: selectedAssets.map(asset => asset.id),
        }),
      });
      setMessage("生成任务已入队");
      await refresh();
      return task;
    } catch (reason) {
      actionError(reason, "生成任务创建失败");
    } finally {
      setLoading(false);
    }
  }

  async function checkComfyUI() {
    setError("");
    setLoading(true);
    try {
      const result = await api<{ ok: boolean; base_url: string; error?: string }>("/ai-video/comfyui/health");
      const next = result.ok ? `ComfyUI 已连接：${result.base_url}` : `ComfyUI 未连接：${result.error || result.base_url}`;
      setMessage(next);
      return next;
    } catch (reason) {
      actionError(reason, "ComfyUI 连接检测失败");
    } finally {
      setLoading(false);
    }
  }

  return {
    store,
    selectedProject,
    selectedProjectId,
    selectedAssets,
    selectedShots,
    selectedTasks,
    loading,
    message,
    error,
    setSelectedProjectId,
    createProject,
    addAsset,
    uploadAsset,
    draftShots,
    createTask,
    checkComfyUI,
    refresh,
  };
}


