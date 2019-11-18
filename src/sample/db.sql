--
-- PostgreSQL database dump
--

DROP TABLE public.tbl_accounts;

CREATE TABLE public.tbl_accounts
(
    tg_uid bigint NOT NULL,
	tg_name character varying(255),
    uos_name character varying(12) NOT NULL,
    last_updated timestamp without time zone,
    CONSTRAINT tbl_accounts_pkey PRIMARY KEY (tg_uid)
)
