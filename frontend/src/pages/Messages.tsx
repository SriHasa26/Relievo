import { DirectMessages } from "@/components/DirectMessages";

export default function Messages() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Direct messages</h1>
      <p className="text-sm text-slate-600">Private messages between coordinators and volunteers.</p>
      <DirectMessages />
    </div>
  );
}
