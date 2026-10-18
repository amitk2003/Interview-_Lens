import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "InterviewLens — Architecture, Engineering Challenges & Pitch Guide")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)
        
        # Footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Confidential — InterviewLens AI Platform Architecture")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()

def build_pdf():
    pdf_filename = os.path.join(os.path.dirname(__file__), "..", "InterviewLens_Architecture_and_Pitch_Guide.pdf")
    pdf_filename = os.path.abspath(pdf_filename)
    
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    primary_color = colors.HexColor("#0F172A")    # Deep slate
    accent_blue = colors.HexColor("#2563EB")      # Vibrant blue
    dark_text = colors.HexColor("#1E293B")        # Charcoal
    muted_text = colors.HexColor("#64748B")       # Muted slate
    table_bg_header = colors.HexColor("#1E293B")  # Header dark
    table_row_alt = colors.HexColor("#F8FAFC")    # Light row
    callout_bg = colors.HexColor("#F1F5F9")       # Light gray callout
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=accent_blue,
        spaceAfter=14
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=accent_blue,
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=dark_text,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=dark_text
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # Title Block
    story.append(Paragraph("InterviewLens", title_style))
    story.append(Paragraph("System Architecture, Engineering Challenges & High-Impact Pitch Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_blue, spaceBefore=0, spaceAfter=10))

    # Executive Summary Box
    summary_text = (
        "<b>Executive Summary:</b> InterviewLens is an AI-powered technical interview evaluation platform "
        "with an integrated Human-in-the-Loop (HITL) calibration and audit workflow. It bridges automated LLM analysis "
        "with vetted human domain experts to eliminate AI hallucinations, calibrate candidate scores across 7 dimensions, "
        "and provide tamper-proof, auditable hiring assessments for modern engineering teams."
    )
    summary_table = Table([[Paragraph(summary_text, body_style)]], colWidths=[504])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), callout_bg),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # Section 1: Architecture
    story.append(Paragraph("1. Complete System Architecture", h1_style))
    story.append(Paragraph(
        "InterviewLens is architected as a high-concurrency, decoupled system split across a modern single-page frontend, "
        "a high-performance asynchronous REST API, and a dual-tier persistence engine with strict security guards.",
        body_style
    ))

    arch_data = [
        [
            Paragraph("Layer", table_header_style),
            Paragraph("Technology", table_header_style),
            Paragraph("Responsibilities & Architectural Highlights", table_header_style)
        ],
        [
            Paragraph("<b>Frontend Client</b>", table_cell_bold),
            Paragraph("React 18, Vite,<br/>Tailwind CSS<br/><i>(Deployed on Vercel)</i>", table_cell_style),
            Paragraph("• Responsive portals for Candidate, Expert, and Admin roles.<br/>"
                      "• Interactive transcript player with synchronized timestamp markers.<br/>"
                      "• Calibration console with live score delta recalculation.<br/>"
                      "• Real-time dispute and admin verification dashboards.", table_cell_style)
        ],
        [
            Paragraph("<b>API Gateway & Services</b>", table_cell_bold),
            Paragraph("FastAPI, Python 3.12, Uvicorn, Gunicorn<br/><i>(Deployed on Render)</i>", table_cell_style),
            Paragraph("• High-throughput asynchronous endpoints with Pydantic validation.<br/>"
                      "• Sliding-window rate limiters preventing abuse on auth and uploads.<br/>"
                      "• Role-Based Access Control (RBAC) with granular resource ownership.<br/>"
                      "• Conflict-of-interest filters preventing evaluator self-reviews.", table_cell_style)
        ],
        [
            Paragraph("<b>AI Analysis Engine</b>", table_cell_bold),
            Paragraph("Groq LLM Engine<br/><i>(Llama 3.3 70B Versatile)</i>,<br/>OpenAI GPT Fallback", table_cell_style),
            Paragraph("• Automated ingestion of video/audio transcripts.<br/>"
                      "• Multi-dimensional evaluation across 7 core technical competencies.<br/>"
                      "• Citation generator attaching timestamped quotes to every finding.<br/>"
                      "• Grounded claim extraction distinguishing facts from assertions.", table_cell_style)
        ],
        [
            Paragraph("<b>HITL State Machine</b>", table_cell_bold),
            Paragraph("Assessment Lifecycle Engine", table_cell_style),
            Paragraph("• Enforces strict progression: <code>ANALYZING &rarr; AWAITING_REVIEW &rarr; ASSIGNED &rarr; IN_REVIEW &rarr; FINALIZED &rarr; RELEASED</code>.<br/>"
                      "• Preserves baseline AI scores to benchmark evaluator drift.<br/>"
                      "• Blocks unauthorized candidate or pending-expert transitions.", table_cell_style)
        ],
        [
            Paragraph("<b>Persistence & Audit</b>", table_cell_bold),
            Paragraph("MongoDB Atlas Primary,<br/>Flat JSON Fallback,<br/>Append-Only Logger", table_cell_style),
            Paragraph("• Fast in-memory cache synchronized with persistent MongoDB Atlas.<br/>"
                      "• Append-only security audit log recording every assignment & score change.<br/>"
                      "• Zero PII leakage via automated password and token redaction.", table_cell_style)
        ]
    ]

    t_arch = Table(arch_data, colWidths=[100, 110, 294])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), table_bg_header),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_row_alt]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 12))

    # Section 2: Challenges Faced
    story.append(Paragraph("2. Core Engineering Challenges & Technical Solutions", h1_style))
    story.append(Paragraph(
        "During the architecture and security audit pass, several complex real-world distributed systems and security "
        "challenges were identified and resolved:",
        body_style
    ))

    challenges_data = [
        [
            Paragraph("Challenge", table_header_style),
            Paragraph("Vulnerability & Root Cause", table_header_style),
            Paragraph("Engineering Solution Implemented", table_header_style)
        ],
        [
            Paragraph("<b>1. IDOR & Usurpation in Assessment Reviews</b>", table_cell_bold),
            Paragraph("Any authenticated user could request review on arbitrary candidate IDs. Furthermore, OAuth login usurped assessments where <code>user_email</code> was empty even if <code>candidate_email</code> belonged to someone else.", table_cell_style),
            Paragraph("• Implemented resource-level candidate ownership checks on <code>/request-expert-review</code>.<br/>"
                      "• Hardened <code>claim_unclaimed_interviews</code> so assessments are claimed ONLY if both <code>user_email</code> and <code>candidate_email</code> are completely unassigned.", table_cell_style)
        ],
        [
            Paragraph("<b>2. Evaluator Conflict-of-Interest</b>", table_cell_bold),
            Paragraph("Experts could browse the unassigned pool and claim their own interviews if they participated as candidates, allowing self-evaluation.", table_cell_style),
            Paragraph("• Built server-side validation in <code>/api/expert/claim/{id}</code> verifying <code>actor.email != candidate_email</code> and <code>actor.id != candidate_id</code>, rejecting collisions with <code>409 Conflict</code>.", table_cell_style)
        ],
        [
            Paragraph("<b>3. Lifecycle State Machine Exploit</b>", table_cell_bold),
            Paragraph("Candidates could call <code>/lifecycle/transition</code> directly via API client to advance their assessment directly to <code>FINALIZED</code> or <code>RELEASED</code>.", table_cell_style),
            Paragraph("• Added role-level authorization enforcing that only verified assigned experts or administrators can trigger lifecycle state updates.", table_cell_style)
        ],
        [
            Paragraph("<b>4. Audit Trail Integrity & Redaction</b>", table_cell_bold),
            Paragraph("Compliance standards require an audit trail of score changes, but accidental logging of passwords or session tokens would violate privacy regulations.", table_cell_style),
            Paragraph("• Engineered recursive key-level sanitization (<code>[REDACTED]</code>).<br/>"
                      "• Maintained an immutable, append-only ledger with no <code>PUT/DELETE</code> endpoints.", table_cell_style)
        ],
        [
            Paragraph("<b>5. Multi-Worker Process Concurrency</b>", table_cell_bold),
            Paragraph("Gunicorn multi-worker deployments instantiate separate process memories, risking session and cache drift across worker forks.", table_cell_style),
            Paragraph("• Synchronized singleton storage to MongoDB Atlas.<br/>"
                      "• Added idempotent test fixtures with dynamic UUIDs to ensure zero test interference across suites.", table_cell_style)
        ]
    ]

    t_chal = Table(challenges_data, colWidths=[110, 180, 214])
    t_chal.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), table_bg_header),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_row_alt]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_chal)
    story.append(Spacer(1, 14))

    # Page Break for Pitches
    story.append(PageBreak())

    # Section 3: 30-Second Pitch
    story.append(Paragraph("3. 30-Second Elevator Pitch & Demo Script", h1_style))
    story.append(Paragraph(
        "<b>Audience:</b> Hackathon judges, recruiters, engineering directors, investors.<br/>"
        "<b>Core Message:</b> Pure AI interview bots hallucinate; human panels are slow. InterviewLens combines instant AI indexing with verified human expert calibration for enterprise-grade hiring.",
        body_style
    ))

    pitch_30_data = [
        [
            Paragraph("Timestamp", table_header_style),
            Paragraph("On-Screen Action (Demo)", table_header_style),
            Paragraph("Spoken Pitch Script (Word-for-Word)", table_header_style)
        ],
        [
            Paragraph("<b>0:00 – 0:08</b><br/><i>(Hook)</i>", table_cell_bold),
            Paragraph("Show homepage with AI assessment report.<br/>Highlight the 7-dimension score.", table_cell_style),
            Paragraph("<i>\"Pure AI interview tools hallucinate, misjudge senior engineers, and create hiring liability. Pure human interview panels take days and cost thousands.\"</i>", table_cell_style)
        ],
        [
            Paragraph("<b>0:08 – 0:18</b><br/><i>(Solution & Demo)</i>", table_cell_bold),
            Paragraph("Switch to <b>Expert Review Console</b>.<br/>Click a citation timestamp; highlight transcript quote and score slider.", table_cell_style),
            Paragraph("<i>\"InterviewLens solves this with Human-in-the-Loop evaluation. Our engine indexes the interview in seconds, but a verified industry expert validates evidence, recalibrates scores, and signs off.\"</i>", table_cell_style)
        ],
        [
            Paragraph("<b>0:18 – 0:30</b><br/><i>(Impact & Close)</i>", table_cell_bold),
            Paragraph("Switch to <b>Admin Audit View</b>.<br/>Show immutable audit trail and published candidate report badge.", table_cell_style),
            Paragraph("<i>\"Every assignment, score change, and publication is protected by strict RBAC and an immutable audit trail. We give enterprise hiring the speed of AI with the credibility of human experts.\"</i>", table_cell_style)
        ]
    ]

    t_p30 = Table(pitch_30_data, colWidths=[80, 160, 264])
    t_p30.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), table_bg_header),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_row_alt]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_p30)
    story.append(Spacer(1, 14))

    # Section 4: 1-Minute Pitch
    story.append(Paragraph("4. 1-Minute Comprehensive Pitch & Full-Workflow Demo Script", h1_style))
    story.append(Paragraph(
        "<b>Audience:</b> Technical demo days, deep-dive evaluation panels, executive sponsors.<br/>"
        "<b>Core Message:</b> Walk through the complete lifecycle: Candidate AI assessment &rarr; Expert calibration &rarr; Admin audit &rarr; Release.",
        body_style
    ))

    pitch_60_data = [
        [
            Paragraph("Timestamp", table_header_style),
            Paragraph("On-Screen Action (Demo)", table_header_style),
            Paragraph("Spoken Pitch Script (Word-for-Word)", table_header_style)
        ],
        [
            Paragraph("<b>0:00 – 0:12</b><br/><i>(Problem Hook)</i>", table_cell_bold),
            Paragraph("Start on landing page.<br/>Click <b>Login as Candidate</b>.<br/>Navigate to candidate dashboard.", table_cell_style),
            Paragraph("<i>\"Hiring top technical talent is broken. Fully autonomous AI interview bots lack domain nuance and hallucinate, while human panels introduce bias and waste hundreds of senior engineering hours. Welcome to InterviewLens.\"</i>", table_cell_style)
        ],
        [
            Paragraph("<b>0:12 – 0:25</b><br/><i>(AI Assessment)</i>", table_cell_bold),
            Paragraph("Open assessment for <b>Distributed Systems Lead</b>.<br/>Show 7 dimensions and timestamped evidence citations.", table_cell_style),
            Paragraph("<i>\"A candidate completes a technical screen. Our engine generates a grounded 7-dimension analysis, citing exact transcript timestamps. But instead of blindly passing this to hiring managers, the assessment enters our Expert Calibration Queue.\"</i>", table_cell_style)
        ],
        [
            Paragraph("<b>0:25 – 0:42</b><br/><i>(Expert Calibration)</i>", table_cell_bold),
            Paragraph("Switch user to <b>Elena Rostova (Staff Expert)</b>.<br/>Open assigned review.<br/>Adjust technical score from 8.0 to 8.4 with justification.", table_cell_style),
            Paragraph("<i>\"Here, a vetted industry expert reviews the evidence. If the AI misunderstood a distributed systems tradeoff, the expert adjusts the score, verifies technical claims against code quotes, and finalizes the review with written rationale.\"</i>", table_cell_style)
        ],
        [
            Paragraph("<b>0:42 – 0:52</b><br/><i>(Admin & Compliance)</i>", table_cell_bold),
            Paragraph("Switch to <b>Admin View</b>.<br/>Inspect approved experts, assignment status, and open <b>Audit Trail</b>.", table_cell_style),
            Paragraph("<i>\"Administrators have complete governance. They verify expert credentials, manage assignments, and access an immutable, PII-sanitized audit log tracking every score override, claim, and publication.\"</i>", table_cell_style)
        ],
        [
            Paragraph("<b>0:52 – 1:00</b><br/><i>(The Result)</i>", table_cell_bold),
            Paragraph("Show released final report badge with expert calibration seal.", table_cell_style),
            Paragraph("<i>\"The result is the gold standard of technical hiring: 10 times faster than traditional interview loops, 100% auditable, and calibrated by real industry leaders.\"</i>", table_cell_style)
        ]
    ]

    t_p60 = Table(pitch_60_data, colWidths=[80, 160, 264])
    t_p60.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), table_bg_header),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_row_alt]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_p60)
    story.append(Spacer(1, 14))

    # Section 5: Deployment & Verification
    story.append(Paragraph("5. Verification Status & Deployment Metadata", h1_style))
    verify_data = [
        [Paragraph("Component", table_header_style), Paragraph("Status", table_header_style), Paragraph("Verification Details & Endpoints", table_header_style)],
        [
            Paragraph("<b>Automated Test Suite</b>", table_cell_bold),
            Paragraph("<font color='#16A34A'><b>51 / 51 PASSED (100%)</b></font>", table_cell_style),
            Paragraph("All 7 test suites passing: Security Authorization (17), RBAC Auth (7), Lifecycle (7), Assignments (5), Verification (3), Profile (2), Benchmark (10).", table_cell_style)
        ],
        [
            Paragraph("<b>Frontend Deployment</b>", table_cell_bold),
            Paragraph("<font color='#16A34A'><b>LIVE (Vercel)</b></font>", table_cell_style),
            Paragraph("Hosted at: <code>https://interview-lens-brown.vercel.app/</code>", table_cell_style)
        ],
        [
            Paragraph("<b>Backend API Deployment</b>", table_cell_bold),
            Paragraph("<font color='#16A34A'><b>LIVE (Render)</b></font>", table_cell_style),
            Paragraph("Hosted at: <code>https://interview-lens-2qgc.onrender.com/api/health</code> (HTTP 200 OK)", table_cell_style)
        ],
        [
            Paragraph("<b>Git Remote Synchronization</b>", table_cell_bold),
            Paragraph("<font color='#16A34A'><b>SYNCHRONIZED</b></font>", table_cell_style),
            Paragraph("Pushed to <code>origin/main</code> at <code>https://github.com/amitk2003/Interview-_Lens.git</code>", table_cell_style)
        ]
    ]

    t_ver = Table(verify_data, colWidths=[120, 120, 264])
    t_ver.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), table_bg_header),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, table_row_alt]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_ver)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {pdf_filename}")

if __name__ == "__main__":
    build_pdf()
