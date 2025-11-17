// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai"; // dùng nếu có OPENAI_API_KEY, nếu không sẽ fallback

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ======= GIẢ LẬP DATABASE TRONG RAM =======
let users = [];
let orders = [];

// ======= KHỞI TẠO OPENAI (NẾU CÓ API KEY) =======
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log("OpenAI client initialized.");
} else {
  console.log("Không có OPENAI_API_KEY, sẽ dùng AI kiểu rule-based (gợi ý cứng).");
}

// ======= API KIỂM TRA SERVER =======
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server đang chạy" });
});

// ======= API ĐĂNG KÝ =======
// body: { fullName, email, password }
app.post("/api/register", (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Thiếu thông tin" });
  }

  const existed = users.find((u) => u.email === email);
  if (existed) {
    return res.status(400).json({ message: "Email đã tồn tại" });
  }

  const newUser = {
    id: Date.now(),
    fullName,
    email,
    password, // demo nên chưa mã hoá
  };
  users.push(newUser);

  res.json({
    message: "Đăng ký thành công",
    user: { id: newUser.id, fullName, email },
  });
});

// ======= API ĐĂNG NHẬP =======
// body: { email, password }
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });
  }

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
  }

  res.json({
    message: "Đăng nhập thành công",
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    },
  });
});

// ======= API TẠO ĐƠN HÀNG (CHECKOUT) =======
// body: { cartItems, userProfile }
app.post("/api/checkout", (req, res) => {
  const { cartItems, userProfile } = req.body || {};

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ message: "Giỏ hàng trống" });
  }

  if (
    !userProfile ||
    !userProfile.fullName ||
    !userProfile.email ||
    !userProfile.phone ||
    !userProfile.address
  ) {
    return res.status(400).json({ message: "Thiếu thông tin người nhận" });
  }

  const orderId = "ORD-" + Date.now();

  const newOrder = {
    orderId,
    cartItems,
    userProfile,
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);

  console.log("Đơn hàng mới:", newOrder);

  res.json({
    message: "Tạo đơn hàng thành công",
    orderId,
  });
});

// ======= API LẤY DANH SÁCH ĐƠN HÀNG =======
app.get("/api/orders", (req, res) => {
  res.json({ orders });
});

// ======= API GỢI Ý SÁCH BẰNG AI =======
// body: { cartItems }
app.post("/api/ai-suggest", async (req, res) => {
  const { cartItems } = req.body || {};
  const items = Array.isArray(cartItems) ? cartItems : [];

  // Tạo prompt mô tả giỏ hàng
  const userText =
    items.length > 0
      ? items
          .map(
            (item, idx) =>
              `${idx + 1}. ${item.title || "Sách"} - ${item.price || ""}`
          )
          .join("\n")
      : "Người dùng chưa chọn cuốn sách nào trong giỏ hàng.";

  const basePrompt = `
    Bạn là trợ lý bán sách online của một nhà sách Việt Nam.
    Dựa trên danh sách sách người dùng đã/chưa thêm vào giỏ hàng,
    hãy gợi ý thêm 3–5 cuốn sách khác phù hợp.
    Trả lời ngắn gọn, mỗi gợi ý trên 1 dòng, tiếng Việt.
  `;

  const finalPrompt = `${basePrompt}\n\nGiỏ hàng hiện tại:\n${userText}`;

  // Nếu có OpenAI_API_KEY -> dùng OpenAI
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Bạn là trợ lý gợi ý sách cho nhà sách online, trả lời bằng tiếng Việt, ngắn gọn, thân thiện.",
          },
          { role: "user", content: finalPrompt },
        ],
        temperature: 0.7,
      });

      const aiText = completion.choices[0].message.content;
      return res.json({ from: "openai", suggestions: aiText });
    } catch (err) {
      console.error("Lỗi gọi OpenAI:", err);
      // fallback xuống rule-based bên dưới
    }
  }

  // Nếu không có OpenAI hoặc lỗi -> dùng gợi ý cứng (rule-based)
  const titles = userText.toLowerCase();
  let suggestions = "";

  if (items.length === 0) {
    suggestions = `
1. Búp Sen Xanh - Phù hợp cho học sinh, sinh viên tìm hiểu về Bác Hồ.
2. Chuyện Kể Từ Làng Sen - Những câu chuyện giản dị về quê hương Bác.
3. Những mẩu chuyện về đời hoạt động của Hồ Chủ tịch.
4. Các Triều Đại Việt Nam - Dành cho bạn yêu lịch sử.
5. Giáo trình HSK cơ bản - Cho người học tiếng Trung.
    `.trim();
  } else if (
    titles.includes("búp sen xanh") ||
    titles.includes("bác hồ") ||
    titles.includes("làng sen")
  ) {
    suggestions = `
1. Những mẩu chuyện về đời hoạt động của Hồ Chủ tịch.
2. Nhật Ký Trong Tù - Ấn bản đặc biệt.
3. Bác Hồ với thiếu niên nhi đồng.
4. Chuyện Kể Từ Làng Sen - Bản mở rộng.
5. Tuyển tập thơ Hồ Chí Minh.
    `.trim();
  } else if (
    titles.includes("kỹ năng") ||
    titles.includes("kĩ năng") ||
    titles.includes("kỹ năng sống")
  ) {
    suggestions = `
1. 7 Thói Quen Hiệu Quả.
2. Tư Duy Tích Cực Mỗi Ngày.
3. Kỹ Năng Giao Tiếp Cho Học Sinh.
4. Làm Chủ Thời Gian - Bí quyết quản lý thời gian hiệu quả.
5. Tuổi Trẻ Đáng Giá Bao Nhiêu?.
    `.trim();
  } else {
    suggestions = `
1. Các Triều Đại Việt Nam - Bổ sung kiến thức lịch sử.
2. Búp Sen Xanh - Câu chuyện về tuổi thơ và lý tưởng.
3. Nhật Ký Trong Tù - Tập thơ nổi tiếng của Chủ tịch Hồ Chí Minh.
4. Chuyện Kể Từ Làng Sen - Nhiều giai thoại thú vị về Bác.
5. Giáo trình HSK - Dành cho người học tiếng Trung.
    `.trim();
  }

  return res.json({ from: "rule-based", suggestions });
});

// ======= KHỞI CHẠY SERVER =======
app.listen(PORT, () => {
  console.log(`Backend đang chạy tại http://localhost:${PORT}`);
});
