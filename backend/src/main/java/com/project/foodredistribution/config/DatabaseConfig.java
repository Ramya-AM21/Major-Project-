package com.project.foodredistribution.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.JpaVendorAdapter;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.net.URI;
import java.util.Properties;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${spring.datasource.url:jdbc:h2:mem:fooddb;DB_CLOSE_DELAY=-1}")
    private String rawUrl;

    @Value("${spring.datasource.username:sa}")
    private String rawUsername;

    @Value("${spring.datasource.password:}")
    private String rawPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        
        String jdbcUrl = rawUrl;
        String username = rawUsername;
        String password = rawPassword;

        // If DATABASE_URL starts with postgres:// or postgresql:// (Render/Heroku format)
        if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) {
            try {
                URI uri = new URI(rawUrl);
                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath();
                
                if (uri.getUserInfo() != null && !uri.getUserInfo().isEmpty()) {
                    String[] userInfo = uri.getUserInfo().split(":");
                    username = userInfo[0];
                    if (userInfo.length > 1) {
                        password = userInfo[1];
                    }
                }

                jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path + "?sslmode=require";
                config.setDriverClassName("org.postgresql.Driver");
                log.info("Converted PostgreSQL URL format to JDBC: {}", jdbcUrl);
            } catch (Exception e) {
                log.error("Failed to parse PostgreSQL URI: {}", e.getMessage());
            }
        } else if (rawUrl.startsWith("mysql://")) {
            try {
                URI uri = new URI(rawUrl);
                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 3306;
                String path = uri.getPath();
                
                if (uri.getUserInfo() != null && !uri.getUserInfo().isEmpty()) {
                    String[] userInfo = uri.getUserInfo().split(":");
                    username = userInfo[0];
                    if (userInfo.length > 1) {
                        password = userInfo[1];
                    }
                }

                jdbcUrl = "jdbc:mysql://" + host + ":" + port + path + "?useSSL=true&allowPublicKeyRetrieval=true";
                config.setDriverClassName("com.mysql.cj.jdbc.Driver");
                log.info("Converted MySQL URI format to JDBC: {}", jdbcUrl);
            } catch (Exception e) {
                log.error("Failed to parse MySQL URI: {}", e.getMessage());
            }
        } else if (rawUrl.contains("jdbc:mysql:")) {
            config.setDriverClassName("com.mysql.cj.jdbc.Driver");
        } else if (rawUrl.contains("jdbc:postgresql:")) {
            config.setDriverClassName("org.postgresql.Driver");
        } else if (rawUrl.contains("jdbc:h2:")) {
            config.setDriverClassName("org.h2.Driver");
        }

        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        
        // Hikari Connection Pool Settings for Cloud Resilience
        config.setInitializationFailTimeout(0); // Prevents crash on initial cold start connection delay
        config.setConnectionTimeout(30000); // 30 seconds
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);

        return new HikariDataSource(config);
    }

    @Bean
    @Primary
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.project.foodredistribution.entity");

        JpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);

        Properties properties = new Properties();
        properties.setProperty("hibernate.hbm2ddl.auto", "update");
        properties.setProperty("hibernate.show_sql", "false");

        // Determine dialect explicitly to avoid 'Unable to determine Dialect without JDBC metadata'
        String urlLower = rawUrl.toLowerCase();
        if (urlLower.contains("postgres")) {
            properties.setProperty("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
            log.info("Configured JPA Hibernate Dialect: PostgreSQLDialect");
        } else if (urlLower.contains("mysql")) {
            properties.setProperty("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");
            log.info("Configured JPA Hibernate Dialect: MySQLDialect");
        } else {
            properties.setProperty("hibernate.dialect", "org.hibernate.dialect.H2Dialect");
            log.info("Configured JPA Hibernate Dialect: H2Dialect");
        }

        em.setJpaProperties(properties);
        return em;
    }

    @Bean
    @Primary
    public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}
