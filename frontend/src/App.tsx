import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/lib/user-context";
import Landing from "./pages/Landing";
import SelectRole from "./pages/SelectRole";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherTopics from "./pages/teacher/TeacherTopics";
import CreateTopic from "./pages/teacher/CreateTopic";
import TopicDetail from "./pages/teacher/TopicDetail";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentTopics from "./pages/student/StudentTopics";
import StudentTopicDetail from "./pages/student/StudentTopicDetail";
import TakeAssessment from "./pages/student/TakeAssessment";
import StudentResults from "./pages/student/StudentResults";
import SubmissionDetail from "./pages/student/SubmissionDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/select-role" element={<SelectRole />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/topics" element={<TeacherTopics />} />
            <Route path="/teacher/topics/new" element={<CreateTopic />} />
            <Route path="/teacher/topics/:topicId" element={<TopicDetail />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/topics" element={<StudentTopics />} />
            <Route path="/student/topics/:topicId" element={<StudentTopicDetail />} />
            <Route path="/student/assessment/:topicId" element={<TakeAssessment />} />
            <Route path="/student/results" element={<StudentResults />} />
            <Route path="/student/submissions/:submissionId" element={<SubmissionDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
